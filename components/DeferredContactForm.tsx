import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ContactForm = dynamic(() => import("./ContactForm"), { ssr: false });

/** Keep the form out of the initial hydration path while reserving its space. */
export default function DeferredContactForm() {
  const [ready, setReady] = useState(false);
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary || !("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: "500px 0px" });
    observer.observe(boundary);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boundaryRef} className="contact-form-boundary">
      {ready ? <ContactForm /> : <div className="contact-form-placeholder" aria-hidden="true" />}
    </div>
  );
}
