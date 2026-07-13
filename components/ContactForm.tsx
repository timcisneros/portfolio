import React, { useState } from "react";
import KeycapSurface from "./KeycapSurface";

type FormStatus = "idle" | "sending" | "sent" | "error";

const ContactForm = () => {
  const [status, setStatus] = useState<FormStatus>("idle");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const field = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement)
        .value;
    const payload = {
      name: field("name"),
      email: field("email"),
      message: field("message"),
    };
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="form-status form-status-ok" role="status">
        Thanks—your message was sent.
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Name
          <input
            name="name"
            type="text"
            required
            maxLength={200}
            autoComplete="name"
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </label>
      </div>
      <label>
        Message
        <textarea name="message" required maxLength={5000} rows={5} />
      </label>
      <button
        type="submit"
        className="btn btn-coral"
        disabled={status === "sending"}
      >
        <KeycapSurface />
        <span className="btn-cap">
          {status === "sending" ? "Sending…" : "Send"}
        </span>
      </button>
      {status === "error" && (
        <p className="form-status form-status-err" role="alert">
          Something went wrong. Email me directly at{" "}
          <a href="mailto:tcisneros.cis@gmail.com">tcisneros.cis@gmail.com</a>.
        </p>
      )}
    </form>
  );
};

export default ContactForm;
