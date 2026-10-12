import { S3Client } from "@aws-sdk/client-s3";

import { env } from "@/env";

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: "eu-central-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export default s3;
