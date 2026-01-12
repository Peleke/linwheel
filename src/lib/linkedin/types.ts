/**
 * LinkedIn API types
 */

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number; // seconds
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInUserInfo {
  sub: string; // LinkedIn person URN (e.g., "urn:li:person:abc123")
  name: string;
  email?: string;
  picture?: string;
}

export interface LinkedInConnection {
  id: string;
  userId: string;
  accessToken: string; // encrypted
  refreshToken: string | null; // encrypted
  expiresAt: Date | null;
  linkedinProfileId: string | null;
  linkedinProfileName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostParams {
  text: string;
  imageUrl?: string;
  altText?: string;
}

export interface LinkedInPostResult {
  postUrn: string;
  postUrl: string;
}

export interface LinkedInImageUploadInit {
  uploadUrl: string;
  imageUrn: string;
}

export interface LinkedInDocumentUploadInit {
  uploadUrl: string;
  documentUrn: string;
}

export interface CreateDocumentPostParams {
  text: string;
  documentUrl: string; // URL to the PDF
  title?: string; // Document title shown in LinkedIn
}
