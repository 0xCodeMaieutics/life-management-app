import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { env } from "@/env";
import s3 from "@/lib/s3";

export async function deleteThreadAttachmentFiles(keys: string[]) {
  await Promise.all(
    keys.map((key) =>
      s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key })),
    ),
  );
}
