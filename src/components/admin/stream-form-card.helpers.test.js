import { describe, expect, it, vi } from "vitest";

import {
  applyStreamFormResetSeed,
  createStreamFormResetSeed,
  resolveResettableMaxPostsPerRun,
} from "./stream-form-card.helpers";

describe("stream form reset helpers", () => {
  it("clamps reset max-post values to the selected provider execution limits", () => {
    expect(resolveResettableMaxPostsPerRun("mediastack", "50")).toBe("33");
    expect(resolveResettableMaxPostsPerRun("mediastack", "0")).toBe("5");
    expect(resolveResettableMaxPostsPerRun("newsapi", "50")).toBe("50");
  });

  it("captures a stable reset seed without sharing nested object references", () => {
    const sourceValues = {
      activeProviderId: "provider_1",
      defaultTemplateId: "template_1",
      destinationId: "destination_1",
      maxPostsPerRun: 5,
      mode: "AUTO_PUBLISH",
      modeWasEdited: true,
      name: "Daily Bulletin",
      nameWasEdited: true,
      postLinkPlacement: "END",
      providerKey: "mediastack",
      providerFormValues: {
        category: ["technology"],
        endpoint: "latest",
      },
      runWindowState: {
        endInputValue: "2026-04-08T12:30",
        startInputValue: "2026-04-07T12:00",
        writeCheckpointOnSuccess: true,
      },
      slug: "daily-bulletin",
      slugWasEdited: true,
      status: "PAUSED",
    };

    const seed = createStreamFormResetSeed(sourceValues);

    sourceValues.providerFormValues.category.push("science");
    sourceValues.runWindowState.writeCheckpointOnSuccess = false;

    expect(seed).toMatchObject({
      activeProviderId: "provider_1",
      defaultTemplateId: "template_1",
      destinationId: "destination_1",
      maxPostsPerRun: "5",
      mode: "AUTO_PUBLISH",
      modeWasEdited: true,
      name: "Daily Bulletin",
      nameWasEdited: true,
      postLinkPlacement: "END",
      providerFormValues: {
        category: ["technology"],
        endpoint: "latest",
      },
      runWindowState: {
        endInputValue: "2026-04-08T12:30",
        startInputValue: "2026-04-07T12:00",
        writeCheckpointOnSuccess: true,
      },
      slug: "daily-bulletin",
      slugWasEdited: true,
      status: "PAUSED",
    });
  });

  it("applies a reset seed to every controlled stream form setter", () => {
    const seed = createStreamFormResetSeed({
      activeProviderId: "provider_2",
      defaultTemplateId: "template_2",
      destinationId: "destination_2",
      maxPostsPerRun: 50,
      mode: "REVIEW_REQUIRED",
      modeWasEdited: false,
      name: "Regional Digest",
      nameWasEdited: false,
      postLinkPlacement: "BELOW_TITLE",
      providerKey: "mediastack",
      providerFormValues: {
        countryAllowlistJson: ["ug"],
        endpoint: "top-headlines",
      },
      runWindowState: {
        endInputValue: "2026-04-08T10:30",
        startInputValue: "2026-04-07T10:00",
        writeCheckpointOnSuccess: false,
      },
      slug: "regional-digest",
      slugWasEdited: false,
      status: "ACTIVE",
    });
    const setters = {
      setActiveProviderId: vi.fn(),
      setDefaultTemplateId: vi.fn(),
      setDestinationId: vi.fn(),
      setMaxPostsPerRun: vi.fn(),
      setMode: vi.fn(),
      setModeWasEdited: vi.fn(),
      setName: vi.fn(),
      setNameWasEdited: vi.fn(),
      setPostLinkPlacement: vi.fn(),
      setProviderFormValues: vi.fn(),
      setRunWindowState: vi.fn(),
      setSlug: vi.fn(),
      setSlugWasEdited: vi.fn(),
      setStatus: vi.fn(),
    };

    const appliedSeed = applyStreamFormResetSeed(seed, setters);
    const appliedProviderValues = setters.setProviderFormValues.mock.calls[0][0];
    const appliedRunWindowState = setters.setRunWindowState.mock.calls[0][0];

    expect(appliedSeed).toEqual(seed);
    expect(setters.setName).toHaveBeenCalledWith("Regional Digest");
    expect(setters.setSlug).toHaveBeenCalledWith("regional-digest");
    expect(setters.setActiveProviderId).toHaveBeenCalledWith("provider_2");
    expect(setters.setDestinationId).toHaveBeenCalledWith("destination_2");
    expect(setters.setDefaultTemplateId).toHaveBeenCalledWith("template_2");
    expect(setters.setMode).toHaveBeenCalledWith("REVIEW_REQUIRED");
    expect(setters.setStatus).toHaveBeenCalledWith("ACTIVE");
    expect(setters.setMaxPostsPerRun).toHaveBeenCalledWith("33");
    expect(setters.setPostLinkPlacement).toHaveBeenCalledWith("BELOW_TITLE");
    expect(setters.setNameWasEdited).toHaveBeenCalledWith(false);
    expect(setters.setSlugWasEdited).toHaveBeenCalledWith(false);
    expect(setters.setModeWasEdited).toHaveBeenCalledWith(false);
    expect(appliedProviderValues).toEqual({
      countryAllowlistJson: ["ug"],
      endpoint: "top-headlines",
    });
    expect(appliedProviderValues).not.toBe(seed.providerFormValues);
    expect(appliedRunWindowState).toEqual({
      endInputValue: "2026-04-08T10:30",
      startInputValue: "2026-04-07T10:00",
      writeCheckpointOnSuccess: false,
    });
    expect(appliedRunWindowState).not.toBe(seed.runWindowState);
  });
});
