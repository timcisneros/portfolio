import { DEFAULT_KEYCAP_CAMERA, type KeycapCamera } from "../cameraStore";
import { KEYCAP_KERNEL as K } from "../kernel";
import { KEYCAP_WGSL } from "./shader";
import { renderSoftwareKeycaps, type SoftwareAtlas } from "./softwareRasterizer";
import type {
  KeycapCompositorOptions,
  KeycapGpuDiagnostics,
  KeycapGpuStatus,
  KeycapHandle,
  KeycapRegistration,
} from "./types";

type GPU = any;

const FLOATS_PER_INSTANCE = 20;
const SCENE_BYTES = 80;
const SOFTWARE_TILE_HEIGHT = 1024;
const SOFTWARE_OBJECT_OVERFLOW = 256;

type StoredInstance = KeycapRegistration & { key: number };

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

export class KeycapGpuEngine {
  private status: KeycapGpuStatus = { state: "idle" };
  private canvas: HTMLCanvasElement | null = null;
  private context: GPU = null;
  private softwareContext: CanvasRenderingContext2D | null = null;
  private softwareAtlas: SoftwareAtlas | null = null;
  private softwarePixelStep = 1;
  private softwareWorker: Worker | null = null;
  private softwareTileHost: HTMLElement | null = null;
  private softwareTiles: HTMLCanvasElement[] = [];
  private softwareTileSignature = "";
  private softwareDocumentWidth = 1;
  private softwareDocumentHeight = 1;
  private adapter: GPU = null;
  private device: GPU = null;
  private pipeline: GPU = null;
  private bindGroup: GPU = null;
  private sceneBuffer: GPU = null;
  private instanceBuffer: GPU = null;
  private legendTexture: GPU = null;
  private legendSampler: GPU = null;
  private instanceCapacity = 0;
  private format = "bgra8unorm";
  private options: KeycapCompositorOptions = {};
  private camera: KeycapCamera = { ...DEFAULT_KEYCAP_CAMERA };
  private instances = new Map<number, StoredInstance>();
  private nextKey = 1;
  private animationFrame = 0;
  private dirty = true;
  private frame = 0;
  private submissions = 0;
  private sceneVersion = 0;
  private gpuFrameMs = 0;
  private gpuP95Ms = 0;
  private completionSamples: number[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private scrollAttached = false;
  private configured = false;
  private statusListeners = new Set<(status: KeycapGpuStatus) => void>();

  get diagnostics(): KeycapGpuDiagnostics {
    return {
      status: this.status,
      instanceCount: this.instances.size,
      frame: this.frame,
      submissions: this.submissions,
      gpuFrameMs: this.gpuFrameMs,
      gpuP95Ms: this.gpuP95Ms,
    };
  }

  subscribeStatus(listener: (status: KeycapGpuStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: KeycapGpuStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  async attach(canvas: HTMLCanvasElement, options: KeycapCompositorOptions = {}) {
    this.detach();
    this.canvas = canvas;
    delete canvas.dataset.renderPresented;
    delete canvas.dataset.legendPresented;
    delete canvas.dataset.legendPending;
    canvas.dataset.frameVersion = "0";
    this.options = options;
    this.softwareTileHost = options.softwareTileHost ?? null;
    window.addEventListener("scroll", this.onViewportScroll, { passive: true });
    this.scrollAttached = true;
    this.camera = { ...DEFAULT_KEYCAP_CAMERA, ...options.camera };
    this.setStatus({ state: "initializing" });
    const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
    if (new URLSearchParams(window.location.search).get("keycap-renderer") === "software") {
      this.attachSoftware(canvas);
      return this.status;
    }
    if (!gpu) {
      this.attachSoftware(canvas);
      return this.status;
    }
    try {
      const adapterRequests = [
        { powerPreference: "high-performance" },
        { powerPreference: "low-power" },
        {},
        { forceFallbackAdapter: true },
      ];
      for (const request of adapterRequests) {
        this.adapter = await gpu.requestAdapter(request);
        if (this.adapter) break;
      }
      if (!this.adapter) {
        this.attachSoftware(canvas);
        return this.status;
      }
      this.device = await this.adapter.requestDevice();
      const attachedDevice = this.device;
      attachedDevice.lost.then((info: { message?: string }) => {
        if (this.device !== attachedDevice) return;
        this.stopFrameLoop();
        this.setStatus({ state: "lost", reason: info.message || "The WebGPU device was lost." });
      });
      this.context = canvas.getContext("webgpu") as GPU;
      if (!this.context) throw new Error("Unable to create a GPUCanvasContext.");
      this.format = gpu.getPreferredCanvasFormat();
      this.sceneBuffer = this.device.createBuffer({
        label: "keycap-scene",
        size: SCENE_BYTES,
        usage: 0x40 | 0x08, // UNIFORM | COPY_DST
      });
      const module = this.device.createShaderModule({ label: "analytic-keycap", code: KEYCAP_WGSL });
      this.pipeline = await this.device.createRenderPipelineAsync({
        label: "keycap-analytic-pipeline",
        layout: "auto",
        vertex: { module, entryPoint: "vertexMain" },
        fragment: {
          module,
          entryPoint: "fragmentMain",
          targets: [{
            format: this.format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            },
          }],
        },
        primitive: { topology: "triangle-list" },
      });
      this.legendSampler = this.device.createSampler({
        label: "keycap-legend-sampler",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      });
      this.legendTexture = this.createEmptyLegendTexture();
      this.resizeObserver = new ResizeObserver(() => this.invalidate());
      this.resizeObserver.observe(canvas);
      const adapterName = this.adapter.info?.description || this.adapter.info?.vendor || "WebGPU adapter";
      this.setStatus({ state: "ready", adapter: adapterName, backend: "webgpu" });
      this.invalidate();
      return this.status;
    } catch (error) {
      this.setStatus({ state: "unsupported", reason: error instanceof Error ? error.message : String(error) });
      return this.status;
    }
  }

  detach() {
    const attachedCanvas = this.canvas;
    this.stopFrameLoop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.scrollAttached) window.removeEventListener("scroll", this.onViewportScroll);
    this.scrollAttached = false;
    this.context?.unconfigure?.();
    if (attachedCanvas && this.softwareContext) {
      this.softwareContext.clearRect(0, 0, attachedCanvas.width, attachedCanvas.height);
    }
    this.softwareWorker?.postMessage({ type: "clear" });
    this.softwareWorker?.terminate();
    this.softwareWorker = null;
    this.softwareTiles.forEach((tile) => tile.remove());
    this.softwareTiles = [];
    this.softwareTileSignature = "";
    if (attachedCanvas) {
      delete attachedCanvas.dataset.renderPresented;
      delete attachedCanvas.dataset.legendPresented;
      delete attachedCanvas.dataset.legendPending;
    }
    this.context = null;
    this.softwareContext = null;
    this.canvas = null;
    this.softwareTileHost = null;
    this.configured = false;
  }

  private onViewportScroll = () => {
    if (this.status.state === "ready" && this.status.backend === "webgpu") this.invalidate();
  };

  private visibleInstances() {
    if (this.status.state === "ready" && this.status.backend === "software") {
      return [...this.instances.values()].filter((instance) => instance.visible !== false);
    }
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    return [...this.instances.values()].map((instance) => {
      if (instance.coordinateSpace !== "document") return instance;
      return {
        ...instance,
        rect: {
          x: instance.rect.x - scrollX,
          y: instance.rect.y - scrollY,
          width: instance.rect.width,
          height: instance.rect.height,
        },
      };
    }).filter((instance) => {
      if (instance.visible === false) return false;
      const rect = instance.rect;
      const verticalOverscan = window.innerHeight * 0.15;
      return rect.x + rect.width >= -120 && rect.x <= window.innerWidth + 120
        && rect.y + rect.height >= -verticalOverscan && rect.y <= window.innerHeight + verticalOverscan;
    });
  }

  private attachSoftware(canvas: HTMLCanvasElement) {
    if (this.softwareTileHost && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function" && typeof Worker !== "undefined") {
      const worker = new Worker(new URL("./softwareWorker.ts", import.meta.url), { type: "module", name: "keycap-software-rasterizer" });
      worker.onmessage = (event: MessageEvent<{ type: string; version: number; elapsed: number; scrollY: number }>) => {
        if (event.data.type !== "presented" || worker !== this.softwareWorker || !this.canvas) return;
        this.completeSoftwareFrame(event.data.version, event.data.elapsed, event.data.scrollY);
      };
      if (this.softwareAtlas) worker.postMessage({ type: "atlas", atlas: this.softwareAtlas });
      this.softwareWorker = worker;
      this.resizeObserver = new ResizeObserver(() => this.invalidate());
      this.resizeObserver.observe(canvas);
      canvas.dataset.softwareThread = "worker";
      this.setStatus({ state: "ready", adapter: "Custom worker depth rasterizer", backend: "software" });
      this.setSoftwareDocumentSize(document.documentElement.clientWidth, document.documentElement.scrollHeight);
      this.invalidate();
      return;
    }
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      this.setStatus({ state: "unsupported", reason: "The browser exposed neither WebGPU nor a 2D pixel-transfer context." });
      return;
    }
    this.softwareContext = context;
    canvas.dataset.softwareThread = "main";
    this.resizeObserver = new ResizeObserver(() => this.invalidate());
    this.resizeObserver.observe(canvas);
    this.setStatus({ state: "ready", adapter: "Custom CPU depth rasterizer", backend: "software" });
    this.invalidate();
  }

  setSoftwareDocumentSize(width: number, height: number) {
    this.softwareDocumentWidth = Math.max(1, width);
    this.softwareDocumentHeight = Math.max(1, height);
    if (this.status.state !== "ready" || this.status.backend !== "software" || !this.softwareWorker || !this.softwareTileHost) return;
    const indices = new Set<number>();
    this.instances.forEach((instance) => {
      if (instance.coordinateSpace !== "document" || instance.visible === false) return;
      const first = Math.max(0, Math.floor((instance.rect.y - SOFTWARE_OBJECT_OVERFLOW) / SOFTWARE_TILE_HEIGHT));
      const last = Math.max(first, Math.floor((instance.rect.y + instance.rect.height + SOFTWARE_OBJECT_OVERFLOW) / SOFTWARE_TILE_HEIGHT));
      for (let index = first; index <= last; index += 1) indices.add(index);
    });
    const ordered = [...indices].sort((a, b) => a - b);
    const signature = `${this.softwareDocumentWidth}:${ordered.join(",")}`;
    if (signature === this.softwareTileSignature) return;
    this.softwareTileSignature = signature;
    this.softwareTiles.forEach((tile) => tile.remove());
    this.softwareTiles = [];
    const transfers: Transferable[] = [];
    const tiles = ordered.map((index) => {
      const top = index * SOFTWARE_TILE_HEIGHT;
      const heightForTile = Math.min(SOFTWARE_TILE_HEIGHT, this.softwareDocumentHeight - top);
      const tile = document.createElement("canvas");
      tile.className = "keycap-software-tile";
      tile.dataset.tileIndex = String(index);
      tile.style.top = `${top}px`;
      tile.style.height = `${heightForTile}px`;
      tile.setAttribute("aria-hidden", "true");
      this.softwareTileHost?.appendChild(tile);
      this.softwareTiles.push(tile);
      const offscreen = tile.transferControlToOffscreen();
      transfers.push(offscreen);
      return { id: index, top, height: heightForTile, canvas: offscreen };
    });
    this.canvas?.setAttribute("data-software-tiles", String(tiles.length));
    this.softwareWorker.postMessage({ type: "tiles", tiles }, transfers);
    this.invalidate();
  }

  register(registration: KeycapRegistration): KeycapHandle {
    const key = this.nextKey++;
    this.instances.set(key, { ...registration, key });
    this.setSoftwareDocumentSize(this.softwareDocumentWidth, this.softwareDocumentHeight);
    this.invalidate();
    let removed = false;
    return {
      key,
      update: (update) => {
        if (removed) return;
        const current = this.instances.get(key);
        if (current) this.instances.set(key, { ...current, ...update, key });
        this.setSoftwareDocumentSize(this.softwareDocumentWidth, this.softwareDocumentHeight);
        this.invalidate();
      },
      remove: () => {
        if (removed) return;
        removed = true;
        this.instances.delete(key);
        this.setSoftwareDocumentSize(this.softwareDocumentWidth, this.softwareDocumentHeight);
        this.invalidate();
      },
    };
  }

  setCamera(camera: Partial<KeycapCamera>, committed = true) {
    this.camera = { ...this.camera, ...camera };
    // Worker presentation is atomic; retaining full sampling during orbit
    // avoids the block artifacts caused by the former interactive 2x2 mode.
    this.softwarePixelStep = 1;
    this.invalidate();
  }

  /**
   * Replaces the engine-wide coverage atlas. Glyphs and icons use the same
   * alpha-mask contract and are mapped by each instance's `legendUv`.
   */
  setLegendAtlasData(data: Uint8Array, width: number, height: number) {
    this.softwareAtlas = { data, width, height };
    if (this.status.state === "ready" && this.status.backend === "software") {
      this.softwareWorker?.postMessage({ type: "atlas", atlas: this.softwareAtlas });
      if (this.canvas) {
        this.canvas.dataset.legendAtlas = `${width}x${height}`;
        this.canvas.dataset.legendPending = "true";
      }
      this.invalidate();
      return true;
    }
    if (!this.device || this.status.state !== "ready") return false;
    const texture = this.device.createTexture({
      label: "keycap-legend-atlas",
      size: [Math.max(1, width), Math.max(1, height), 1],
      format: "r8unorm",
      mipLevelCount: 3,
      usage: 0x04 | 0x02, // TEXTURE_BINDING | COPY_DST
    });
    let levelData = data;
    let levelWidth = width;
    let levelHeight = height;
    for (let mipLevel = 0; mipLevel < 3; mipLevel += 1) {
      this.device.queue.writeTexture(
        { texture, mipLevel },
        levelData,
        { bytesPerRow: levelWidth, rowsPerImage: levelHeight },
        [levelWidth, levelHeight, 1],
      );
      if (mipLevel < 2) {
        const nextWidth = levelWidth / 2;
        const nextHeight = levelHeight / 2;
        const next = new Uint8Array(nextWidth * nextHeight);
        for (let y = 0; y < nextHeight; y += 1) {
          for (let x = 0; x < nextWidth; x += 1) {
            const source = (y * 2) * levelWidth + x * 2;
            next[y * nextWidth + x] = Math.round((
              levelData[source] + levelData[source + 1]
              + levelData[source + levelWidth] + levelData[source + levelWidth + 1]
            ) / 4);
          }
        }
        levelData = next;
        levelWidth = nextWidth;
        levelHeight = nextHeight;
      }
    }
    this.legendTexture?.destroy?.();
    this.legendTexture = texture;
    if (this.canvas) {
      this.canvas.dataset.legendAtlas = `${width}x${height}`;
      this.canvas.dataset.legendPending = "true";
      delete this.canvas.dataset.legendPresented;
    }
    this.rebuildBindGroup();
    this.invalidate();
    return true;
  }

  invalidate() {
    this.dirty = true;
    this.sceneVersion += 1;
    if (this.canvas) this.canvas.dataset.sceneVersion = String(this.sceneVersion);
    if (!this.animationFrame && typeof requestAnimationFrame !== "undefined") {
      this.animationFrame = requestAnimationFrame(this.renderFrame);
    }
  }

  private stopFrameLoop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  private ensureInstanceBuffer(count: number) {
    const required = Math.max(1, count);
    if (required <= this.instanceCapacity) return;
    this.instanceCapacity = 2 ** Math.ceil(Math.log2(required));
    this.instanceBuffer?.destroy?.();
    this.instanceBuffer = this.device.createBuffer({
      label: "keycap-instances",
      size: this.instanceCapacity * FLOATS_PER_INSTANCE * 4,
      usage: 0x80 | 0x08, // STORAGE | COPY_DST
    });
    this.rebuildBindGroup();
  }

  private createEmptyLegendTexture() {
    const texture = this.device.createTexture({
      label: "keycap-empty-legend-atlas",
      size: [1, 1, 1],
      format: "r8unorm",
      usage: 0x04 | 0x02, // TEXTURE_BINDING | COPY_DST
    });
    this.device.queue.writeTexture({ texture }, new Uint8Array([0]), { bytesPerRow: 1 }, [1, 1, 1]);
    return texture;
  }

  private rebuildBindGroup() {
    if (!this.device || !this.pipeline || !this.instanceBuffer || !this.legendTexture || !this.legendSampler) return;
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.sceneBuffer } },
        { binding: 1, resource: { buffer: this.instanceBuffer } },
        { binding: 2, resource: this.legendTexture.createView() },
        { binding: 3, resource: this.legendSampler },
      ],
    });
  }

  private resizeAndConfigure() {
    if (!this.canvas || !this.context || !this.device) return false;
    const dpr = this.options.devicePixelRatio ?? window.devicePixelRatio ?? 1;
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.configured = false;
    }
    if (!this.configured) {
      this.context.configure({ device: this.device, format: this.format, alphaMode: "premultiplied" });
      this.configured = true;
    }
    return true;
  }

  private renderFrame = (now: number) => {
    this.animationFrame = 0;
    if (this.status.state !== "ready" || (!this.dirty && !this.options.continuous)) return;
    this.dirty = false;
    if (this.status.backend === "software") {
      this.renderSoftwareFrame();
      return;
    }
    if (!this.resizeAndConfigure() || !this.canvas || !this.device) return;
    const dpr = this.options.devicePixelRatio ?? window.devicePixelRatio ?? 1;
    const canvasRect = this.canvas.getBoundingClientRect();
    const visible = this.visibleInstances();
    this.canvas.dataset.visibleInstances = String(visible.length);
    this.canvas.dataset.legendInstances = String(visible.filter((instance) => {
      const uv = instance.legendUv;
      return !!uv && uv[2] > 0 && uv[3] > 0;
    }).length);
    this.ensureInstanceBuffer(visible.length);

    const data = new Float32Array(Math.max(1, visible.length) * FLOATS_PER_INSTANCE);
    visible.forEach((instance, index) => {
      const offset = index * FLOATS_PER_INSTANCE;
      const rect = instance.rect;
      const x = (rect.x - canvasRect.x) * dpr;
      const y = (rect.y - canvasRect.y) * dpr;
      data.set([x, y, rect.width * dpr, rect.height * dpr], offset);
      data.set([...instance.material.color, 1], offset + 4);
      const inferredUnits = clamp(rect.width / Math.max(rect.height, 1), 0.35, 12);
      data.set([
        instance.widthUnits ?? inferredUnits,
        instance.material.roughness ?? 0.66,
        instance.material.ambient ?? 0.22,
        1,
      ], offset + 8);
      data.set(instance.legendUv ?? [0, 0, 0, 0], offset + 12);
      data.set([...(instance.material.legendColor ?? [0.95, 0.95, 0.95]), 1], offset + 16);
    });
    this.device.queue.writeBuffer(this.instanceBuffer, 0, data);

    const radians = Math.PI / 180;
    const scene = new Float32Array(SCENE_BYTES / 4);
    scene.set([this.canvas.width, this.canvas.height, dpr, now / 1000], 0);
    scene.set([
      this.camera.azimuthDeg * radians,
      this.camera.elevationDeg * radians,
      this.camera.distance,
      this.camera.verticalFovDeg * radians,
    ], 4);
    scene.set([0, 0, this.camera.targetZ, this.frame], 8);
    scene.set([K.lightX, K.lightY, K.lightZ, K.lightRadius], 12);
    this.device.queue.writeBuffer(this.sceneBuffer, 0, scene);

    const encoder = this.device.createCommandEncoder({ label: `keycap-frame-${this.frame}` });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store",
      }],
    });
    if (visible.length) {
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(6, visible.length);
    }
    pass.end();
    const submittedAt = performance.now();
    const submittedVisibleInstances = visible.length;
    this.device.queue.submit([encoder.finish()]);
    const measuredCanvas = this.canvas;
    void this.device.queue.onSubmittedWorkDone().then(() => {
      if (!measuredCanvas || measuredCanvas !== this.canvas) return;
      const latency = performance.now() - submittedAt;
      this.gpuFrameMs = latency;
      this.completionSamples.push(latency);
      if (this.completionSamples.length > 120) this.completionSamples.shift();
      const sorted = [...this.completionSamples].sort((a, b) => a - b);
      this.gpuP95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? latency;
      measuredCanvas.dataset.gpuFrameMs = latency.toFixed(2);
      measuredCanvas.dataset.gpuP95Ms = this.gpuP95Ms.toFixed(2);
      if (submittedVisibleInstances > 0 && measuredCanvas.dataset.renderPresented !== "true") {
        measuredCanvas.dataset.renderPresented = "true";
        measuredCanvas.dispatchEvent(new CustomEvent("keycap-frame-presented"));
      }
      if (submittedVisibleInstances > 0 && measuredCanvas.dataset.legendPending === "true") {
        delete measuredCanvas.dataset.legendPending;
        measuredCanvas.dataset.legendPresented = "true";
        measuredCanvas.dispatchEvent(new CustomEvent("keycap-legends-presented"));
      }
    });
    this.frame += 1;
    this.submissions += 1;
    this.canvas.dataset.frameVersion = String(this.sceneVersion);
    if (this.options.continuous) this.invalidate();
  };

  private renderSoftwareFrame() {
    if (!this.canvas) return;
    const visible = this.visibleInstances();
    if (this.softwareWorker) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const instances = visible.map((instance) => ({
        ...instance,
        rect: {
          x: instance.rect.x,
          y: instance.rect.y,
          width: instance.rect.width,
          height: instance.rect.height,
        },
      }));
      this.softwareWorker.postMessage({
        type: "render",
        version: this.sceneVersion,
        width: this.softwareDocumentWidth,
        height: this.softwareDocumentHeight,
        dpr,
        pixelStep: this.softwarePixelStep,
        scrollY: 0,
        camera: this.camera,
        instances,
      });
      return;
    }
    if (!this.softwareContext) return;
    const startedAt = performance.now();
    renderSoftwareKeycaps(this.softwareContext, this.canvas, visible, this.camera, this.softwareAtlas, this.softwarePixelStep);
    this.completeSoftwareFrame(this.sceneVersion, performance.now() - startedAt, window.scrollY);
  }

  private completeSoftwareFrame(version: number, elapsed: number, scrollY: number) {
    if (!this.canvas || this.status.state !== "ready" || this.status.backend !== "software") return;
    const visible = this.visibleInstances();
    this.canvas.dataset.visibleInstances = String(visible.length);
    this.canvas.dataset.legendInstances = String(visible.filter((instance) => {
      const uv = instance.legendUv;
      return !!uv && uv[2] > 0 && uv[3] > 0;
    }).length);
    this.canvas.dataset.gpuFrameMs = elapsed.toFixed(2);
    this.canvas.dataset.frameVersion = String(version);
    this.canvas.dataset.presentedScrollY = String(scrollY);
    this.frame += 1;
    this.submissions += 1;
    if (visible.length > 0 && this.canvas.dataset.renderPresented !== "true") {
      this.canvas.dataset.renderPresented = "true";
      this.canvas.dispatchEvent(new CustomEvent("keycap-frame-presented"));
    }
    if (visible.length > 0 && this.canvas.dataset.legendPending === "true") {
      delete this.canvas.dataset.legendPending;
      this.canvas.dataset.legendPresented = "true";
      this.canvas.dispatchEvent(new CustomEvent("keycap-legends-presented"));
    }
    this.canvas.dispatchEvent(new CustomEvent("keycap-frame-committed", { detail: { scrollY } }));
    if (this.options.continuous) this.invalidate();
  }
}

let sharedEngine: KeycapGpuEngine | null = null;

/** All compositor islands and instances share this device, scheduler and scene. */
export function getKeycapGpuEngine() {
  if (!sharedEngine) sharedEngine = new KeycapGpuEngine();
  return sharedEngine;
}
