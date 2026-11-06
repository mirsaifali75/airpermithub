/**
 * What a contact message can be about, shared by the form and the server.
 * The label is the only part of the subject line, so a visitor can't write it.
 */
export const contactTopics = {
  question: "A question about the site or a tool",
  error: "Report an error",
  partnership: "Partnership",
  job: "Job posting",
  other: "Something else",
} as const;

export type ContactTopic = keyof typeof contactTopics;

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;
