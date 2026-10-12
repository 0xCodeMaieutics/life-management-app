import { FileTextIcon } from "lucide-react";

import {
  Attachment,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";

const UUID_PREFIX = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}-/;

function getFileName(key: string) {
  return key.replace(UUID_PREFIX, "");
}

export function MatterAttachment({ fileKey }: { fileKey: string }) {
  return (
    <Attachment size="sm">
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{getFileName(fileKey)}</AttachmentTitle>
      </AttachmentContent>
    </Attachment>
  );
}
