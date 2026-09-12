export type RobotState = "idle" | "listening" | "thinking" | "speaking" | "happy";

export type ChatMessage = {
  id: number;
  sender: "user" | "milo";
  text: string;
  whatsapp?: { contactName: string; sent: boolean; url?: string; reason?: string };
};
