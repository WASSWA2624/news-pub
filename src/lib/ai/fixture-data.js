import { microscopeAcceptanceFixture } from "./fixture-data-microscope";

export const endoscopyMachineAcceptanceFixture = Object.freeze({
  compositionNotes: Object.freeze({
    howToUseSteps: Object.freeze([
      {
        description:
          "Confirm that the processor, light source, insufflation, suction, irrigation, and image capture pathways complete their startup checks before the procedure list begins.",
        title: "Verify the tower and peripheral systems",
      },
      {
        description:
          "Inspect the insertion tube, control head, angulation knobs, distal tip, valves, and connectors for visible damage, then connect the scope to the processor and light source according to the model-specific guide.",
        title: "Prepare and connect the endoscope",
      },
      {
        description:
          "White-balance the camera chain, confirm image sharpness on the monitor, and check that insufflation, suction, irrigation, and accessory channels respond as expected before patient use.",
        title: "Calibrate imaging and functional controls",
      },
      {
        description:
          "During use, advance the scope gently, maintain orientation on the display, and coordinate angulation, insufflation, suction, and accessory deployment without forcing resistance.",
        title: "Operate with controlled visualization",
      },
      {
        description:
          "After the procedure, perform immediate bedside pre-cleaning, disconnect carefully, transfer for leak testing and reprocessing, and document any handling issue or performance concern for follow-up.",
        title: "Close out, reprocess, and document",
      },
    ]),
    relatedKeywords: Object.freeze([
      "endoscopy machine",
      "endoscopy tower",
      "video endoscopy system",
      "endoscope maintenance",
      "endoscopy processor manuals",
    ]),
  }),
  researchInput: Object.freeze({
    aliases: [
      "Endoscopy tower",
      "Video endoscopy system",
      "Flexible endoscopy machine",
      "Endoscopic imaging system",
    ],
    components: Object.freeze([
      {
        description:
          "The video processor manages image acquisition, signal processing, color reproduction, and communication with connected scopes and monitors.",
        label: "Video processor unit",
        sourceReferenceIds: ["src_fixture_processor_reference"],
      },
      {
        description:
          "The light source provides the illumination needed for cavity visualization and is often integrated with intensity controls and lamp-life monitoring.",
        label: "Light source module",
        sourceReferenceIds: ["src_fixture_light_reference"],
      },
      {
        description:
          "The flexible endoscope contains the insertion tube, bending section, distal optics, accessory channels, and control head used during examination or intervention.",
        label: "Flexible endoscope assembly",
        sourceReferenceIds: ["src_fixture_scope_reference"],
      },
      {
        description:
          "Insufflation, suction, and irrigation controls support field visualization, secretion management, and procedural progress.",
        label: "Fluid and gas management controls",
        sourceReferenceIds: ["src_fixture_accessory_reference"],
      },
      {
        description:
          "The display monitor presents the live image stream and should preserve brightness, color fidelity, and geometric stability for safe interpretation.",
        label: "Medical display monitor",
        sourceReferenceIds: ["src_fixture_display_reference"],
      },
      {
        description:
          "Capture, storage, and network interfaces allow still images, clips, and case metadata to be stored or transferred according to workflow policy.",
        label: "Capture and documentation interface",
        sourceReferenceIds: ["src_fixture_documentation_reference"],
      },
    ]),
    definition: Object.freeze({
      sourceReferenceIds: ["src_fixture_definition_reference"],
      summary:
        "An endoscopy machine is a coordinated video-imaging and support system that allows clinicians to visualize internal anatomy using an endoscope, associated light source, processor, display, and procedural support modules.",
    }),
    faults: Object.freeze([
      {
        cause:
          "Light source degradation, loose optical coupling, contaminated distal optics, or an incomplete white-balance sequence can reduce image quality.",
        severity: "high",
        sourceReferenceIds: [
          "src_fixture_light_reference",
          "src_fixture_reprocessing_manual",
          "src_fixture_processor_manual",
        ],
        symptoms:
          "The image appears dim, color-shifted, noisy, or lacks expected detail despite normal monitor power and cabling.",
        title: "Image is dark or poorly balanced",
        remedy:
          "Check lamp status, confirm optical and electrical connections, clean approved optical surfaces, repeat white balance, and compare with the model-specific troubleshooting guide.",
      },
      {
        cause:
          "Channel obstruction, valve wear, improper setup, or pump mismatch can impair suction, irrigation, or insufflation response.",
        severity: "high",
        sourceReferenceIds: ["src_fixture_accessory_reference", "src_fixture_processor_manual"],
        symptoms:
          "Insufflation is delayed, suction is weak, or irrigation flow is inconsistent during the procedure.",
        title: "Insufflation, suction, or irrigation is ineffective",
        remedy:
          "Inspect valves and tubing, verify the configured support module, confirm channel patency, and remove the scope from service if function remains abnormal after approved checks.",
      },
      {
        cause:
          "Insertion-tube strain, angulation wire wear, or control head damage can prevent normal directional movement.",
        severity: "critical",
        sourceReferenceIds: ["src_fixture_scope_reference", "src_fixture_service_manual"],
        symptoms:
          "The distal tip does not respond smoothly, return to neutral is inconsistent, or angulation feels stiff or asymmetric.",
        title: "Angulation response is restricted",
        remedy:
          "Stop use, inspect for obvious mechanical damage, quarantine the scope, and escalate for technical evaluation rather than forcing the control section.",
      },
      {
        cause:
          "Incomplete pre-cleaning, failed leak testing, channel damage, or contamination retained after reprocessing can make the device unsafe for reuse.",
        severity: "critical",
        sourceReferenceIds: ["src_fixture_reprocessing_manual", "src_fixture_leak_reference"],
        symptoms:
          "Leak-test failure, visible fluid ingress, retained debris, unexplained odor, or repeated reprocessing exceptions are observed.",
        title: "Reprocessing or leak-test failure occurs",
        remedy:
          "Remove the scope from circulation immediately, follow the reprocessing and leak-test policy step by step, and document the event for biomedical and infection-prevention review.",
      },
    ]),
    manuals: Object.freeze([
      {
        accessStatus: "available",
        fileType: "PDF",
        language: "English",
        lastCheckedAt: "2026-04-03T08:00:00.000Z",
        notes: "Operator guide for processor startup, image controls, and connected-scope workflow.",
        sourceReferenceIds: ["src_fixture_processor_manual"],
        title: "Video endoscopy processor operator manual",
        url: "https://fixtures.example/manuals/video-endoscopy-processor-operator-manual.pdf",
      },
      {
        accessStatus: "available",
        fileType: "PDF",
        language: "English",
        lastCheckedAt: "2026-04-03T08:00:00.000Z",
        notes: "Reprocessing and leak-testing guide for flexible endoscopes and accessories.",
        sourceReferenceIds: ["src_fixture_reprocessing_manual"],
        title: "Flexible endoscope reprocessing and leak-test guide",
        url: "https://fixtures.example/manuals/flexible-endoscope-reprocessing-guide.pdf",
      },
      {
        accessStatus: "available",
        fileType: "PDF",
        language: "English",
        lastCheckedAt: "2026-04-03T08:00:00.000Z",
        notes: "Service guidance covering angulation, channel integrity, and processor fault isolation.",
        sourceReferenceIds: ["src_fixture_service_manual"],
        title: "Endoscopy system service reference",
        url: "https://fixtures.example/manuals/endoscopy-system-service-reference.pdf",
      },
    ]),
    maintenanceTasks: Object.freeze([
      {
        description:
          "Inspect the processor front panel, light source status, monitor image, cabling, and accessory modules before the first case of the day.",
        frequency: "Daily",
        label: "Perform system startup inspection",
        sourceReferenceIds: ["src_fixture_processor_manual"],
      },
      {
        description:
          "Carry out immediate bedside pre-cleaning after each case so bioburden does not dry inside channels or around distal components.",
        frequency: "After each use",
        label: "Complete point-of-use pre-cleaning",
        sourceReferenceIds: ["src_fixture_reprocessing_manual"],
      },
      {
        description:
          "Run leak testing and channel verification according to the approved reprocessing pathway before high-level disinfection or sterilization steps continue.",
        frequency: "After each use",
        label: "Verify leak integrity and channel readiness",
        sourceReferenceIds: ["src_fixture_reprocessing_manual", "src_fixture_leak_reference"],
      },
      {
        description:
          "Check image calibration, white-balance behavior, illumination output, and accessory-module function against the technical acceptance checklist.",
        frequency: "Monthly",
        label: "Check imaging and support-module performance",
        sourceReferenceIds: ["src_fixture_processor_manual", "src_fixture_light_reference"],
      },
      {
        description:
          "Review angulation mechanics, insertion-tube condition, connector integrity, and electrical safety within the biomedical maintenance program.",
        frequency: "Quarterly",
        label: "Perform preventive technical review",
        sourceReferenceIds: ["src_fixture_service_manual", "src_fixture_scope_reference"],
      },
    ]),
    manufacturers: Object.freeze([
      {
        aliases: ["Olympian"],
        models: Object.freeze([
          {
            aliases: ["Olympian VisioFlex 700"],
            equipmentTypeConfirmed: true,
            latestKnownYear: 2025,
            name: "Olympian VisioFlex 700",
            sourceReferenceIds: ["src_fixture_olympian_model_page", "src_fixture_olympian_manual"],
            summary:
              "A high-definition flexible video endoscopy platform used for general diagnostic and interventional workflows.",
          },
          {
            aliases: ["Olympian VisioFlex 900"],
            equipmentTypeConfirmed: true,
            latestKnownYear: 2026,
            name: "Olympian VisioFlex 900",
            sourceReferenceIds: ["src_fixture_olympian_advanced_model_page", "src_fixture_olympian_manual"],
            summary:
              "An advanced imaging configuration with expanded documentation and peripheral integration capabilities.",
          },
        ]),
        name: "Olympian Endoscopy",
        primaryDomain: "olympian-endoscopy.example",
        sourceReferenceIds: ["src_fixture_olympian_brand_page", "src_fixture_distributor_reference"],
      },
      {
        aliases: ["NexaScope"],
        models: Object.freeze([
          {
            equipmentTypeConfirmed: true,
            latestKnownYear: 2025,
            name: "NexaScope GI Vision Pro",
            sourceReferenceIds: ["src_fixture_nexascope_model_page", "src_fixture_nexascope_manual"],
            summary:
              "A gastrointestinal video endoscopy system focused on bright imaging, rapid setup, and common endoscopy-room integration.",
          },
          {
            equipmentTypeConfirmed: true,
            latestKnownYear: 2024,
            name: "NexaScope PulmoView Elite",
            sourceReferenceIds: ["src_fixture_nexascope_pulmo_model_page", "src_fixture_nexascope_manual"],
            summary:
              "A bronchoscopy-oriented platform with accessory-channel and airway visualization features.",
          },
        ]),
        name: "NexaScope Medical",
        primaryDomain: "nexascope-medical.example",
        sourceReferenceIds: ["src_fixture_nexascope_brand_page", "src_fixture_distributor_reference"],
      },
      {
        aliases: ["Lumina"],
        models: Object.freeze([
          {
            equipmentTypeConfirmed: true,
            latestKnownYear: 2023,
            name: "Lumina EndoSuite X5",
            sourceReferenceIds: ["src_fixture_lumina_model_page", "src_fixture_lumina_manual"],
            summary:
              "A compact endoscopy tower for mixed diagnostic suites where footprint, image capture, and routine supportability matter.",
          },
        ]),
        name: "Lumina Surgical Imaging",
        primaryDomain: "lumina-surgical-imaging.example",
        sourceReferenceIds: ["src_fixture_lumina_brand_page", "src_fixture_education_reference"],
      },
    ]),
    mediaCandidates: Object.freeze([
      {
        sectionAffinity: ["featured_image"],
        alt: "Complete endoscopy tower prepared for procedure-room setup.",
        attributionText: "Image metadata for endoscopy tower overview.",
        caption:
          "A complete endoscopy machine combines the processor, light source, monitor, and connected support modules into one coordinated procedural system.",
        height: 900,
        isAiGenerated: false,
        licenseType: "CC0",
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference"],
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Endoscopy_Surgery.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as a system-level visual for editorial previews.",
        width: 1400,
      },
      {
        sectionAffinity: ["components_visual_guide", "operation_visual_guide"],
        alt: "Flexible endoscope control head and angulation controls.",
        attributionText: "Image metadata for endoscope control section.",
        caption:
          "Control head layout, angulation response, and channel access matter because they directly affect safe manipulation during use.",
        height: 900,
        isAiGenerated: false,
        licenseType: "CC BY-SA 3.0",
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference"],
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Flexibles_Endoskop.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as an inline control-section illustration.",
        width: 1400,
      },
      {
        sectionAffinity: ["workflow_visual_guide", "operation_visual_guide"],
        alt: "Endoscopy room display showing live procedural visualization.",
        attributionText: "Image metadata for endoscopy display workflow.",
        caption:
          "Image quality depends on the full chain from distal optics and processor settings to monitor performance and white-balance confirmation.",
        height: 900,
        isAiGenerated: false,
        licenseType: "Public domain",
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference"],
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Endoscopy.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as an inline imaging-workflow illustration.",
        width: 1400,
      },
      {
        sectionAffinity: ["model_visual_guide"],
        alt: "Flexible bronchoscope prepared for airway visualization.",
        attributionText: "Image metadata for bronchoscopy-oriented endoscopy system.",
        caption:
          "Bronchoscopy-oriented systems illustrate how endoscopy platforms vary by scope form factor, channel expectations, and procedural context.",
        height: 900,
        isAiGenerated: false,
        licenseType: "CC BY-SA 4.0",
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference", "src_fixture_nexascope_pulmo_model_page"],
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Bronchoscope.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as a model-family illustration for bronchoscopy-oriented configurations.",
        width: 1400,
      },
      {
        sectionAffinity: ["model_visual_guide"],
        alt: "Endoscopy processor and monitor stack in a procedure room.",
        attributionText: "Image metadata for integrated endoscopy platform stack.",
        caption:
          "Historical and museum-preserved endoscopes help readers recognize how endoscope form factor and working-channel layout vary across equipment families.",
        height: 900,
        isAiGenerated: false,
        licenseType: "CC BY-SA 3.0 FR",
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference", "src_fixture_olympian_model_page"],
        sourceUrl:
          "https://commons.wikimedia.org/wiki/Special:FilePath/Endoscope_at_Palais_de_la_Decouverte-IMG_6924-white.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as a model-family illustration for endoscopy tower configurations.",
        width: 1400,
      },
      {
        sectionAffinity: ["workflow_visual_guide"],
        alt: "Endoscope insertion tube and distal section prepared for handling review.",
        attributionText: "Image metadata for scope-handling workflow.",
        caption:
          "Handling visuals are useful because workflow quality depends on tube condition, distal-tip care, and controlled manipulation during use and reprocessing.",
        height: 900,
        isAiGenerated: false,
        licenseType: "Public domain",
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference", "src_fixture_scope_reference"],
        sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Bronchoscopy_nci-vol-1950-300.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as a workflow illustration for handling and reprocessing context.",
        width: 1400,
      },
    ]),
    operatingPrinciple: Object.freeze({
      sourceReferenceIds: ["src_fixture_processor_reference", "src_fixture_scope_reference"],
      summary:
        "An endoscopy machine illuminates internal anatomy, captures reflected or transmitted optical information through the endoscope, processes the image digitally, and displays the result in real time while supporting suction, insufflation, irrigation, and accessory-based intervention.",
    }),
    safetyPrecautions: Object.freeze([
      {
        description:
          "Do not force insertion, withdrawal, or angulation because resistance can indicate anatomy-related risk, channel obstruction, or equipment damage requiring reassessment.",
        label: "Avoid forcing the scope or control section",
        sourceReferenceIds: ["src_fixture_scope_reference", "src_fixture_service_manual"],
      },
      {
        description:
          "Separate point-of-use cleaning, leak testing, and formal reprocessing steps exactly as required so reuse does not proceed with unresolved contamination or integrity concerns.",
        label: "Follow the complete reprocessing pathway",
        sourceReferenceIds: ["src_fixture_reprocessing_manual", "src_fixture_leak_reference"],
      },
      {
        description:
          "Check electrical connections, peripheral attachments, and processor alarms before patient use so imaging loss or support-module failure does not appear unexpectedly during the procedure.",
        label: "Verify the full system before use",
        sourceReferenceIds: ["src_fixture_processor_manual", "src_fixture_light_reference"],
      },
      {
        description:
          "Use only approved accessories, valves, and cleaning agents because incompatible parts can damage channels, optics, seals, or documentation of traceability.",
        label: "Use approved accessories and consumables",
        sourceReferenceIds: ["src_fixture_accessory_reference", "src_fixture_reprocessing_manual"],
      },
    ]),
    sourceReferences: Object.freeze([
      {
        id: "src_fixture_definition_reference",
        reliabilityTier: "tier_2_trusted_reference",
        sourceDomain: "nih.gov",
        sourceType: "TRUSTED_BIOMEDICAL_REFERENCE",
        title: "Endoscopy systems overview",
        url: "https://nih.gov/fixtures/endoscopy-systems-overview",
      },
      {
        id: "src_fixture_processor_reference",
        reliabilityTier: "tier_2_trusted_reference",
        sourceDomain: "medlineplus.gov",
        sourceType: "TRUSTED_BIOMEDICAL_REFERENCE",
        title: "Endoscopic video processing overview",
        url: "https://medlineplus.gov/fixtures/endoscopy-video-processing",
      },
      {
        id: "src_fixture_scope_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "gastro.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Flexible endoscope components teaching note",
        url: "https://gastro.example.edu/fixtures/flexible-endoscope-components",
      },
      {
        id: "src_fixture_light_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "surgery.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Endoscopy illumination and image quality note",
        url: "https://surgery.example.edu/fixtures/endoscopy-illumination",
      },
      {
        id: "src_fixture_accessory_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "bronchoscopy.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Accessory channels, suction, and insufflation teaching note",
        url: "https://bronchoscopy.example.edu/fixtures/endoscopy-accessory-channels",
      },
      {
        id: "src_fixture_display_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "biomed.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Medical display performance in endoscopy rooms",
        url: "https://biomed.example.edu/fixtures/endoscopy-displays",
      },
      {
        id: "src_fixture_documentation_reference",
        reliabilityTier: "tier_2_verified_partner",
        sourceDomain: "workflow.fixtures.example",
        sourceType: "OFFICIAL_DISTRIBUTOR_DOCUMENTATION",
        title: "Endoscopy capture and documentation integration note",
        url: "https://workflow.fixtures.example/endoscopy-documentation",
      },
      {
        id: "src_fixture_leak_reference",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Flexible endoscope leak-testing note",
        url: "https://fixtures.example/manuals/flexible-endoscope-leak-testing.pdf",
      },
      {
        id: "src_fixture_processor_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Video endoscopy processor operator manual",
        url: "https://fixtures.example/manuals/video-endoscopy-processor-operator-manual.pdf",
      },
      {
        id: "src_fixture_reprocessing_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Flexible endoscope reprocessing and leak-test guide",
        url: "https://fixtures.example/manuals/flexible-endoscope-reprocessing-guide.pdf",
      },
      {
        id: "src_fixture_service_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Endoscopy system service reference",
        url: "https://fixtures.example/manuals/endoscopy-system-service-reference.pdf",
      },
      {
        id: "src_fixture_distributor_reference",
        reliabilityTier: "tier_2_verified_partner",
        sourceDomain: "procurement.fixtures.example",
        sourceType: "OFFICIAL_DISTRIBUTOR_DOCUMENTATION",
        title: "Approved distributor listing for endoscopy systems",
        url: "https://procurement.fixtures.example/endoscopy-systems",
      },
      {
        id: "src_fixture_education_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "endoscopy.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Endoscopy workflow and training applications note",
        url: "https://endoscopy.example.edu/fixtures/endoscopy-training-applications",
      },
      {
        id: "src_fixture_olympian_brand_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "olympian-endoscopy.example",
        sourceType: "OFFICIAL_MANUFACTURER_WEBSITE",
        title: "Olympian Endoscopy system overview",
        url: "https://olympian-endoscopy.example/systems",
      },
      {
        id: "src_fixture_olympian_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "olympian-endoscopy.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "Olympian VisioFlex 700",
        url: "https://olympian-endoscopy.example/visioflex-700",
      },
      {
        id: "src_fixture_olympian_advanced_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "olympian-endoscopy.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "Olympian VisioFlex 900",
        url: "https://olympian-endoscopy.example/visioflex-900",
      },
      {
        id: "src_fixture_olympian_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "olympian-endoscopy.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Olympian VisioFlex operator reference",
        url: "https://olympian-endoscopy.example/manuals/visioflex-operator-reference.pdf",
      },
      {
        id: "src_fixture_nexascope_brand_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "nexascope-medical.example",
        sourceType: "OFFICIAL_MANUFACTURER_WEBSITE",
        title: "NexaScope Medical endoscopy platforms",
        url: "https://nexascope-medical.example/endoscopy-platforms",
      },
      {
        id: "src_fixture_nexascope_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "nexascope-medical.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "NexaScope GI Vision Pro",
        url: "https://nexascope-medical.example/gi-vision-pro",
      },
      {
        id: "src_fixture_nexascope_pulmo_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "nexascope-medical.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "NexaScope PulmoView Elite",
        url: "https://nexascope-medical.example/pulmoview-elite",
      },
      {
        id: "src_fixture_nexascope_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "nexascope-medical.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "NexaScope endoscopy platform service and operator guide",
        url: "https://nexascope-medical.example/manuals/platform-guide.pdf",
      },
      {
        id: "src_fixture_lumina_brand_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "lumina-surgical-imaging.example",
        sourceType: "OFFICIAL_MANUFACTURER_WEBSITE",
        title: "Lumina Surgical Imaging endoscopy catalogue",
        url: "https://lumina-surgical-imaging.example/endoscopy-catalogue",
      },
      {
        id: "src_fixture_lumina_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "lumina-surgical-imaging.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "Lumina EndoSuite X5",
        url: "https://lumina-surgical-imaging.example/endosuite-x5",
      },
      {
        id: "src_fixture_lumina_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "lumina-surgical-imaging.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Lumina EndoSuite X5 setup and care manual",
        url: "https://lumina-surgical-imaging.example/manuals/endosuite-x5-care.pdf",
      },
      {
        id: "src_fixture_image_reference",
        reliabilityTier: "tier_4_discovery_only",
        sourceDomain: "fixtures.example",
        sourceType: "APPROVED_SEARCH_RESULT",
        title: "Endoscopy imagery source",
        url: "https://fixtures.example/images/endoscopy-image-license",
      },
    ]),
    uses: Object.freeze([
      {
        description:
          "Endoscopy systems support diagnostic visualization, biopsy guidance, therapeutic intervention, and procedural documentation across gastrointestinal, airway, and related specialty workflows.",
        label: "Diagnostic and interventional visualization",
        sourceReferenceIds: ["src_fixture_definition_reference", "src_fixture_education_reference"],
      },
      {
        description:
          "Reprocessing, leak testing, and technical inspection workflows depend on the machine because safe reuse is tied to both procedural and post-procedure system performance.",
        label: "Reprocessing and technical support workflows",
        sourceReferenceIds: ["src_fixture_reprocessing_manual", "src_fixture_service_manual"],
      },
      {
        description:
          "Training environments use endoscopy towers to teach scope handling, image interpretation, accessory coordination, and room-setup discipline.",
        label: "Education and skills training",
        sourceReferenceIds: ["src_fixture_education_reference"],
      },
    ]),
    variants: Object.freeze([
      {
        description:
          "Upper and lower gastrointestinal video systems often share processor architecture but differ in scope dimensions, accessory expectations, and common clinical workflow.",
        label: "GI endoscopy platforms",
        sourceReferenceIds: ["src_fixture_definition_reference", "src_fixture_processor_reference"],
      },
      {
        description:
          "Bronchoscopy-oriented configurations emphasize airway access, secretion management, and accessory compatibility for pulmonary procedures.",
        label: "Bronchoscopy systems",
        sourceReferenceIds: ["src_fixture_accessory_reference", "src_fixture_education_reference"],
      },
      {
        description:
          "Compact or mobile endoscopy towers reduce footprint while preserving core processor, display, and documentation functions for flexible deployment.",
        label: "Compact mobile endoscopy towers",
        sourceReferenceIds: ["src_fixture_documentation_reference", "src_fixture_lumina_model_page"],
      },
    ]),
  }),
});

export function getFixtureByNormalizedEquipmentName(normalizedEquipmentName) {
  if (
    normalizedEquipmentName === "microscope" ||
    normalizedEquipmentName === "compound microscope" ||
    normalizedEquipmentName === "laboratory microscope" ||
    normalizedEquipmentName === "optical microscope"
  ) {
    return microscopeAcceptanceFixture;
  }

  if (
    normalizedEquipmentName === "endoscopy machine" ||
    normalizedEquipmentName === "endoscopy system" ||
    normalizedEquipmentName === "endoscopy"
  ) {
    return endoscopyMachineAcceptanceFixture;
  }

  return null;
}
