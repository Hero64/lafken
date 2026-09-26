import { createHash } from 'node:crypto';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import type { Hash, HttpRequest, SourceData } from '@smithy/types';

/**
 * `SignatureV4` only needs an object implementing `update`/`digest` — using
 * Node's built-in `crypto` avoids pulling in a dedicated sha256 package.
 */
class NodeSha256 implements Hash {
  private hash = createHash('sha256');

  update(toHash: SourceData) {
    if (typeof toHash === 'string') {
      this.hash.update(toHash, 'utf8');
      return;
    }

    this.hash.update(
      ArrayBuffer.isView(toHash)
        ? new Uint8Array(toHash.buffer, toHash.byteOffset, toHash.byteLength)
        : new Uint8Array(toHash)
    );
  }

  digest() {
    return Promise.resolve(new Uint8Array(this.hash.digest()));
  }
}

export interface SignPublishRequestProps {
  httpDomain: string;
  region?: string;
  body: string;
}

/**
 * Signs an Event API publish request with SigV4 (`AWS_IAM` authorization
 * mode), using the caller's ambient AWS credentials (e.g. the Lambda
 * execution role).
 */
export const signPublishRequest = async ({
  httpDomain,
  region,
  body,
}: SignPublishRequestProps) => {
  const signingRegion = region || process.env.AWS_REGION;

  if (!signingRegion) {
    throw new Error(
      'IAM publish auth requires a region. Pass it explicitly or set AWS_REGION.'
    );
  }

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: signingRegion,
    service: 'appsync',
    sha256: NodeSha256,
  });

  const request: HttpRequest = {
    method: 'POST',
    protocol: 'https:',
    hostname: httpDomain,
    path: '/event',
    headers: {
      host: httpDomain,
      'content-type': 'application/json',
    },
    body,
  };

  const signed = await signer.sign(request);

  return signed.headers;
};
