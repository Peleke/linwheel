import { describe, it, expect } from "vitest";
import {
  POST_IMAGE_SIZES,
  ARTICLE_IMAGE_SIZES,
  CAROUSEL_IMAGE_SIZES,
  DEFAULT_POST_IMAGE_SIZE,
  DEFAULT_ARTICLE_IMAGE_SIZE,
  DEFAULT_CAROUSEL_IMAGE_SIZE,
  getPostImageDimensions,
  getArticleImageDimensions,
  getCarouselImageDimensions,
  aspectRatioToFalSize,
  PROFILE_IMAGE_SIZES,
  EVENT_IMAGE_SIZES,
  GROUP_IMAGE_SIZES,
  STORIES_IMAGE_SIZE,
  VIDEO_CONSTRAINTS,
} from "@/lib/linkedin-image-config";

/**
 * LinkedIn Image Configuration Tests
 *
 * These tests ensure that our image dimensions match LinkedIn's official specifications.
 * Source: https://www.linkedin.com/pulse/linkedin-image-size-guide-julie-thomas-tftwc/
 */

describe("LinkedIn Image Config", () => {
  describe("POST_IMAGE_SIZES", () => {
    it("should have square format at 1080x1080", () => {
      expect(POST_IMAGE_SIZES.square.width).toBe(1080);
      expect(POST_IMAGE_SIZES.square.height).toBe(1080);
      expect(POST_IMAGE_SIZES.square.aspectRatio).toBe("1:1");
    });

    it("should have portrait format at 1080x1920", () => {
      expect(POST_IMAGE_SIZES.portrait.width).toBe(1080);
      expect(POST_IMAGE_SIZES.portrait.height).toBe(1920);
      expect(POST_IMAGE_SIZES.portrait.aspectRatio).toBe("9:16");
    });

    it("should have landscape format at 1920x1080", () => {
      expect(POST_IMAGE_SIZES.landscape.width).toBe(1920);
      expect(POST_IMAGE_SIZES.landscape.height).toBe(1080);
      expect(POST_IMAGE_SIZES.landscape.aspectRatio).toBe("16:9");
    });

    it("should default to square format", () => {
      expect(DEFAULT_POST_IMAGE_SIZE).toBe("square");
    });
  });

  describe("ARTICLE_IMAGE_SIZES", () => {
    it("should have featured format at 1200x644", () => {
      expect(ARTICLE_IMAGE_SIZES.featured.width).toBe(1200);
      expect(ARTICLE_IMAGE_SIZES.featured.height).toBe(644);
    });

    it("should have banner format at 600x322", () => {
      expect(ARTICLE_IMAGE_SIZES.banner.width).toBe(600);
      expect(ARTICLE_IMAGE_SIZES.banner.height).toBe(322);
    });

    it("should have link preview format at 1200x627", () => {
      expect(ARTICLE_IMAGE_SIZES.linkPreview.width).toBe(1200);
      expect(ARTICLE_IMAGE_SIZES.linkPreview.height).toBe(627);
    });

    it("should default to featured format", () => {
      expect(DEFAULT_ARTICLE_IMAGE_SIZE).toBe("featured");
    });
  });

  describe("CAROUSEL_IMAGE_SIZES", () => {
    it("should have square format at 1080x1080", () => {
      expect(CAROUSEL_IMAGE_SIZES.square.width).toBe(1080);
      expect(CAROUSEL_IMAGE_SIZES.square.height).toBe(1080);
      expect(CAROUSEL_IMAGE_SIZES.square.aspectRatio).toBe("1:1");
    });

    it("should have portrait format at 1080x1920", () => {
      expect(CAROUSEL_IMAGE_SIZES.portrait.width).toBe(1080);
      expect(CAROUSEL_IMAGE_SIZES.portrait.height).toBe(1920);
      expect(CAROUSEL_IMAGE_SIZES.portrait.aspectRatio).toBe("9:16");
    });

    it("should default to square format", () => {
      expect(DEFAULT_CAROUSEL_IMAGE_SIZE).toBe("square");
    });
  });

  describe("getPostImageDimensions", () => {
    it("should return square dimensions by default", () => {
      const dims = getPostImageDimensions();
      expect(dims.width).toBe(1080);
      expect(dims.height).toBe(1080);
    });

    it("should return correct dimensions for each size", () => {
      expect(getPostImageDimensions("square").width).toBe(1080);
      expect(getPostImageDimensions("portrait").height).toBe(1920);
      expect(getPostImageDimensions("landscape").width).toBe(1920);
    });
  });

  describe("getArticleImageDimensions", () => {
    it("should return featured dimensions by default", () => {
      const dims = getArticleImageDimensions();
      expect(dims.width).toBe(1200);
      expect(dims.height).toBe(644);
    });

    it("should return correct dimensions for each size", () => {
      expect(getArticleImageDimensions("featured").height).toBe(644);
      expect(getArticleImageDimensions("banner").width).toBe(600);
      expect(getArticleImageDimensions("linkPreview").width).toBe(1200);
    });
  });

  describe("getCarouselImageDimensions", () => {
    it("should return square dimensions by default", () => {
      const dims = getCarouselImageDimensions();
      expect(dims.width).toBe(1080);
      expect(dims.height).toBe(1080);
    });

    it("should return correct dimensions for portrait", () => {
      const dims = getCarouselImageDimensions("portrait");
      expect(dims.width).toBe(1080);
      expect(dims.height).toBe(1920);
    });
  });

  describe("aspectRatioToFalSize", () => {
    it("should convert 1:1 to square_hd", () => {
      expect(aspectRatioToFalSize("1:1")).toBe("square_hd");
    });

    it("should convert 16:9 to landscape_16_9", () => {
      expect(aspectRatioToFalSize("16:9")).toBe("landscape_16_9");
    });

    it("should convert 9:16 to portrait_16_9", () => {
      expect(aspectRatioToFalSize("9:16")).toBe("portrait_16_9");
    });

    it("should default to square_hd for unknown ratios", () => {
      expect(aspectRatioToFalSize("unknown")).toBe("square_hd");
    });
  });

  describe("Profile and Company sizes (reference)", () => {
    it("should have correct profile picture size", () => {
      expect(PROFILE_IMAGE_SIZES.profilePicture.width).toBe(400);
      expect(PROFILE_IMAGE_SIZES.profilePicture.height).toBe(400);
    });

    it("should have correct company banner size", () => {
      expect(PROFILE_IMAGE_SIZES.companyBanner.width).toBe(1128);
      expect(PROFILE_IMAGE_SIZES.companyBanner.height).toBe(191);
    });
  });

  describe("Event sizes (reference)", () => {
    it("should have correct event banner size", () => {
      expect(EVENT_IMAGE_SIZES.eventBanner.width).toBe(1600);
      expect(EVENT_IMAGE_SIZES.eventBanner.height).toBe(900);
    });
  });

  describe("Group sizes (reference)", () => {
    it("should have correct group banner size", () => {
      expect(GROUP_IMAGE_SIZES.groupBanner.width).toBe(1536);
      expect(GROUP_IMAGE_SIZES.groupBanner.height).toBe(768);
    });
  });

  describe("Stories size", () => {
    it("should have correct stories dimensions", () => {
      expect(STORIES_IMAGE_SIZE.width).toBe(1080);
      expect(STORIES_IMAGE_SIZE.height).toBe(1920);
      expect(STORIES_IMAGE_SIZE.aspectRatio).toBe("9:16");
    });
  });

  describe("Video constraints", () => {
    it("should have correct min/max dimensions", () => {
      expect(VIDEO_CONSTRAINTS.minWidth).toBe(256);
      expect(VIDEO_CONSTRAINTS.minHeight).toBe(144);
      expect(VIDEO_CONSTRAINTS.maxWidth).toBe(4096);
      expect(VIDEO_CONSTRAINTS.maxHeight).toBe(2304);
    });

    it("should have correct file size limits", () => {
      expect(VIDEO_CONSTRAINTS.minFileSize).toBe(75 * 1024); // 75KB
      expect(VIDEO_CONSTRAINTS.maxFileSize).toBe(200 * 1024 * 1024); // 200MB
    });

    it("should have correct max duration", () => {
      expect(VIDEO_CONSTRAINTS.maxDuration).toBe(600); // 10 minutes
    });
  });
});
