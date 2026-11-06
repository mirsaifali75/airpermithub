"use server";

import { accountsEnabled } from "@/lib/auth/config";
import { sendEmail } from "@/lib/auth/email";
import { field, textField, type FormState } from "@/lib/auth/forms";
import { claim, emailKey, networkKey, release, rules, SITE_KEY } from "@/lib/auth/limits";
import { clientNetwork } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";
import { checkContact, contactEmailMessage } from "@/lib/contact";
import { prisma } from "@/lib/db/prisma";
import { contactEmail } from "@/lib/site";

const writeDirectly = contactEmail ? ` Or email ${contactEmail} directly.` : "";

/**
 * Sends a contact-form message to the public inbox, with the visitor's address
 * as Reply-To. The recipient is fixed, so the form can't be used to email anyone else.
 */
export async function sendContactMessage(_: FormState, form: FormData): Promise<FormState> {
  const values = {
    topic: field(form, "topic"), name: textField(form, "name").slice(0, 200), email: field(form, "email").trim().slice(0, 300),
    page: textField(form, "page").slice(0, 600), source: textField(form, "source").slice(0, 600), message: field(form, "message").slice(0, 6000),
  };
  if (!accountsEnabled || !contactEmail) return { error: `The contact form isn't available right now.${writeDirectly}`, values };

  // A field people can't see. Software that fills in every box gets the thank-you, and nothing is sent.
  if (field(form, "website")) return { notice: values.email };

  const checked = checkContact(values);
  if ("error" in checked) return { error: checked.error, field: checked.field, values };
  const m = checked.ok;

  const claimed = await claim(prisma, [
    [networkKey(await clientNetwork()), rules.contactNetwork],
    [emailKey(m.email), rules.contactSender],
    [SITE_KEY, rules.contactDaily],
  ]);
  if (!claimed) return { error: `You've sent several messages recently, so we've paused the form for now. Try again in an hour.${writeDirectly}`, values };

  const session = await getSession();
  const signedIn = !!session?.user.email && session.user.email.toLowerCase() === m.email;
  try {
    await sendEmail(contactEmail, contactEmailMessage(m, { signedIn }), { replyTo: m.email });
  } catch (e) {
    await release(prisma, claimed);
    console.error("contact email failed", e instanceof Error ? e.message : e);
    return { error: `We couldn't send your message just now.${writeDirectly}`, values };
  }
  return { notice: m.email };
}
