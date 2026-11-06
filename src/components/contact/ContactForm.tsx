"use client";

import { useActionState, useId, useState } from "react";
import { sendContactMessage } from "@/app/contact/actions";
import { Field, FormAlert, inputClass } from "@/components/auth/fields";
import { Button } from "@/components/ui/Button";
import type { FormState } from "@/lib/auth/forms";
import { contactTopics, MESSAGE_MAX, MESSAGE_MIN, type ContactTopic } from "@/lib/contact-topics";

const textareaClass = `${inputClass.replace("h-12 ", "")} min-h-36 py-2.5`;

/** The contact form. Sends to the public inbox; the visitor's address becomes the reply address. */
export function ContactForm() {
  const id = useId();
  const [state, action, pending] = useActionState<FormState, FormData>(sendContactMessage, {});
  const v = state.values ?? {};
  const [topic, setTopic] = useState<ContactTopic>((v.topic as ContactTopic) || "question");
  const bad = (name: string) => (state.field === name ? true : undefined);

  if (state.notice) {
    return (
      <div role="status" className="rounded-xl bg-eco-50 px-5 py-4 text-eco-700">
        <p className="font-semibold">Thanks, your message was sent.</p>
        <p className="mt-1 text-sm">We&apos;ll reply to {state.notice}.</p>
      </div>
    );
  }

  const isError = topic === "error";
  return (
    <form action={action} className="space-y-4">
      <FormAlert message={state.error} />
      <Field id={`${id}-topic`} label="What is this about?">
        <select id={`${id}-topic`} name="topic" value={topic} onChange={(e) => setTopic(e.target.value as ContactTopic)} className={inputClass} aria-invalid={bad("topic")}>
          {(Object.keys(contactTopics) as ContactTopic[]).map((k) => <option key={k} value={k}>{contactTopics[k]}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-name`} label="Your name (optional)">
          <input id={`${id}-name`} name="name" autoComplete="name" maxLength={100} defaultValue={v.name} key={`n${v.name}`} className={inputClass} aria-invalid={bad("name")} />
        </Field>
        <Field id={`${id}-email`} label="Your email" hint="We reply to this address.">
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v.email} key={`e${v.email}`} className={inputClass} aria-invalid={bad("email")} aria-describedby={`${id}-email-hint`} />
        </Field>
      </div>
      {isError && (
        <>
          <Field id={`${id}-page`} label="Page with the error" hint="Copy the address from your browser's address bar.">
            <input id={`${id}-page`} name="page" type="text" inputMode="url" autoComplete="url" placeholder="https://airpermithub.com/states/…" maxLength={500} defaultValue={v.page} key={`p${v.page}`} className={inputClass} aria-invalid={bad("page")} aria-describedby={`${id}-page-hint`} />
          </Field>
          <Field id={`${id}-source`} label="Official source with the correct information (optional)" hint="A link to the agency rule, permit, or guidance, if you have one.">
            <input id={`${id}-source`} name="source" type="text" inputMode="url" autoComplete="off" placeholder="https://…" maxLength={500} defaultValue={v.source} key={`s${v.source}`} className={inputClass} aria-invalid={bad("source")} aria-describedby={`${id}-source-hint`} />
          </Field>
        </>
      )}
      <Field id={`${id}-message`} label={isError ? "What looks wrong?" : "Message"}>
        <textarea
          id={`${id}-message`} name="message" required minLength={MESSAGE_MIN} maxLength={MESSAGE_MAX} rows={6} defaultValue={v.message} key={`m${v.message}`}
          className={textareaClass} aria-invalid={bad("message")}
        />
      </Field>
      {/* Left empty by people; software that fills every box is ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>{pending ? "Sending..." : "Send message"}</Button>
    </form>
  );
}
