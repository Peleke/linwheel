/**
 * LinkedIn API client for posting content
 */

import { LinkedInError } from "./errors";
import type {
  CreatePostParams,
  CreateDocumentPostParams,
  LinkedInPostResult,
  LinkedInImageUploadInit,
  LinkedInDocumentUploadInit,
} from "./types";

const LINKEDIN_API_BASE = "https://api.linkedin.com/rest";
const LINKEDIN_API_VERSION = "202411"; // November 2024 API version

export class LinkedInClient {
  private accessToken: string;
  private personUrn: string;

  constructor(accessToken: string, personUrn: string) {
    this.accessToken = accessToken;
    this.personUrn = personUrn;
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_API_VERSION,
    };
  }

  /**
   * Initialize an image upload
   */
  async initializeImageUpload(): Promise<LinkedInImageUploadInit> {
    const response = await fetch(
      `${LINKEDIN_API_BASE}/images?action=initializeUpload`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: this.personUrn,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("LinkedIn image upload init failed:", error);
      throw new LinkedInError(
        "IMAGE_UPLOAD_FAILED",
        `Failed to initialize image upload: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      uploadUrl: data.value.uploadUrl,
      imageUrn: data.value.image,
    };
  }

  /**
   * Upload an image to LinkedIn
   * @param imageUrl - URL of the image to upload
   * @returns The LinkedIn image URN
   */
  async uploadImage(imageUrl: string): Promise<string> {
    // Initialize the upload
    const { uploadUrl, imageUrn } = await this.initializeImageUpload();

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new LinkedInError(
        "IMAGE_UPLOAD_FAILED",
        "Failed to fetch image from source URL"
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get("Content-Type") || "image/jpeg";

    // Upload to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": contentType,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error("LinkedIn image upload failed:", error);
      throw new LinkedInError(
        "IMAGE_UPLOAD_FAILED",
        `Failed to upload image: ${uploadResponse.status}`
      );
    }

    return imageUrn;
  }

  /**
   * Initialize a document upload (for PDF carousels)
   */
  async initializeDocumentUpload(): Promise<LinkedInDocumentUploadInit> {
    const response = await fetch(
      `${LINKEDIN_API_BASE}/documents?action=initializeUpload`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: this.personUrn,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("LinkedIn document upload init failed:", error);
      throw new LinkedInError(
        "DOCUMENT_UPLOAD_FAILED",
        `Failed to initialize document upload: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      uploadUrl: data.value.uploadUrl,
      documentUrn: data.value.document,
    };
  }

  /**
   * Upload a document (PDF) to LinkedIn
   * @param documentUrl - URL of the PDF to upload
   * @returns The LinkedIn document URN
   */
  async uploadDocument(documentUrl: string): Promise<string> {
    // Initialize the upload
    const { uploadUrl, documentUrn } = await this.initializeDocumentUpload();

    // Fetch the document
    const docResponse = await fetch(documentUrl);
    if (!docResponse.ok) {
      throw new LinkedInError(
        "DOCUMENT_UPLOAD_FAILED",
        "Failed to fetch document from source URL"
      );
    }

    const docBuffer = await docResponse.arrayBuffer();

    // Upload to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/pdf",
      },
      body: docBuffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error("LinkedIn document upload failed:", error);
      throw new LinkedInError(
        "DOCUMENT_UPLOAD_FAILED",
        `Failed to upload document: ${uploadResponse.status}`
      );
    }

    return documentUrn;
  }

  /**
   * Create a document post (carousel) on LinkedIn
   */
  async createDocumentPost(
    params: CreateDocumentPostParams
  ): Promise<LinkedInPostResult> {
    // Upload the document first
    const documentUrn = await this.uploadDocument(params.documentUrl);

    const postBody: Record<string, unknown> = {
      author: this.personUrn,
      commentary: params.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      content: {
        media: {
          id: documentUrn,
          title: params.title || "Document",
        },
      },
    };

    const response = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("LinkedIn document post creation failed:", error);

      if (response.status === 429) {
        throw new LinkedInError("RATE_LIMITED", "LinkedIn rate limit exceeded");
      }
      if (response.status === 403) {
        throw new LinkedInError(
          "CONTENT_REJECTED",
          "Content was rejected by LinkedIn"
        );
      }

      throw new LinkedInError(
        "POST_FAILED",
        `Failed to create document post: ${response.status}`
      );
    }

    const postUrn = response.headers.get("x-restli-id");
    if (!postUrn) {
      throw new LinkedInError(
        "POST_FAILED",
        "No post URN returned from LinkedIn"
      );
    }

    const postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;

    return {
      postUrn,
      postUrl,
    };
  }

  /**
   * Create a post on LinkedIn
   */
  async createPost(params: CreatePostParams): Promise<LinkedInPostResult> {
    const postBody: Record<string, unknown> = {
      author: this.personUrn,
      commentary: params.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    // If image provided, upload it first
    if (params.imageUrl) {
      const imageUrn = await this.uploadImage(params.imageUrl);
      postBody.content = {
        media: {
          id: imageUrn,
          altText: params.altText || "Post image",
        },
      };
    }

    const response = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("LinkedIn post creation failed:", error);

      // Check for specific error types
      if (response.status === 429) {
        throw new LinkedInError("RATE_LIMITED", "LinkedIn rate limit exceeded");
      }
      if (response.status === 403) {
        throw new LinkedInError(
          "CONTENT_REJECTED",
          "Content was rejected by LinkedIn"
        );
      }

      throw new LinkedInError(
        "POST_FAILED",
        `Failed to create post: ${response.status}`
      );
    }

    // LinkedIn returns the post URN in the x-restli-id header
    const postUrn = response.headers.get("x-restli-id");
    if (!postUrn) {
      throw new LinkedInError("POST_FAILED", "No post URN returned from LinkedIn");
    }

    // Construct the post URL
    // URN format: urn:li:share:123456 or urn:li:ugcPost:123456
    const postId = postUrn.split(":").pop();
    const postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;

    return {
      postUrn,
      postUrl,
    };
  }
}
