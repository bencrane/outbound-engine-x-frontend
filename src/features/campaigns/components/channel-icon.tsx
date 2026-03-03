"use client";

import { FileText, Linkedin, Mail, Phone } from "lucide-react";

interface ChannelIconProps {
  channel: "email" | "linkedin" | "direct_mail" | "voicemail";
  className?: string;
}

export function ChannelIcon({ channel, className }: ChannelIconProps) {
  if (channel === "linkedin") {
    return <Linkedin className={className} />;
  }
  if (channel === "direct_mail") {
    return <FileText className={className} />;
  }
  if (channel === "voicemail") {
    return <Phone className={className} />;
  }
  return <Mail className={className} />;
}
