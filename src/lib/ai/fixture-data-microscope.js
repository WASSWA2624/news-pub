export const microscopeAcceptanceFixture = Object.freeze({
  compositionNotes: Object.freeze({
    howToUseSteps: Object.freeze([
      {
        description:
          "Confirm that the microscope stand is stable, the optics are clean, and the illumination path is unobstructed before introducing a specimen.",
        title: "Inspect and prepare the microscope",
      },
      {
        description:
          "Place the slide on the stage, secure it with the stage clips, and start with the lowest-power objective to find the specimen safely.",
        title: "Load and center the specimen",
      },
      {
        description:
          "Use coarse focus only at low magnification, then refine the image with fine focus and the condenser or diaphragm controls.",
        title: "Focus progressively",
      },
      {
        description:
          "Increase magnification only after the specimen is centered and sharp, and adjust illumination to maintain contrast rather than forcing brightness.",
        title: "Increase magnification deliberately",
      },
      {
        description:
          "Record findings, return to low power, remove the slide, and leave the microscope clean, covered, and ready for the next user.",
        title: "Shut down and document use",
      },
    ]),
    relatedKeywords: Object.freeze([
      "microscope",
      "compound microscope",
      "laboratory microscope",
      "microscope maintenance",
      "microscope manuals",
    ]),
  }),
  researchInput: Object.freeze({
    aliases: ["Compound microscope", "Laboratory microscope", "Optical microscope"],
    components: Object.freeze([
      {
        details: "Provides the first stage of magnification and supports comfortable binocular or monocular viewing.",
        label: "Eyepiece or ocular assembly",
        sourceReferenceIds: ["src_fixture_components_reference"],
      },
      {
        details:
          "Objective lenses supply selectable magnification levels and should be changed in a controlled sequence from low power to high power.",
        label: "Objective turret and objectives",
        sourceReferenceIds: ["src_fixture_optics_reference"],
      },
      {
        details: "The stage positions the slide and allows precise X-Y movement for systematic specimen scanning.",
        label: "Mechanical stage",
        sourceReferenceIds: ["src_fixture_components_reference"],
      },
      {
        details:
          "Fine and coarse focus controls move the optics or stage to bring the specimen into clear focus without striking the slide.",
        label: "Focus controls",
        sourceReferenceIds: ["src_fixture_manual_focus"],
      },
      {
        details:
          "The illumination train, condenser, and diaphragm work together to improve brightness, contrast, and image quality.",
        label: "Illumination and condenser system",
        sourceReferenceIds: ["src_fixture_optics_reference"],
      },
    ]),
    definition: Object.freeze({
      sourceReferenceIds: ["src_fixture_definition_reference"],
      summary:
        "A microscope is an optical instrument used to magnify and examine specimens that are too small to inspect adequately with the unaided eye.",
    }),
    faults: Object.freeze([
      {
        cause: "Objective or eyepiece surfaces are contaminated, or the specimen is not correctly focused.",
        severity: "MEDIUM",
        sourceReferenceIds: ["src_fixture_manual_cleaning", "src_fixture_manual_focus"],
        symptoms:
          "The specimen appears hazy, lacks edge definition, or will not reach a crisp image at expected magnification.",
        title: "Image is blurry",
        remedy:
          "Clean approved optical surfaces with lens paper, refocus at low power first, and then refine the image gradually with fine focus.",
      },
      {
        cause: "The light source is switched off, the brightness control is too low, or the lamp module has failed.",
        severity: "HIGH",
        sourceReferenceIds: ["src_fixture_manual_illumination"],
        symptoms: "The field is dark even though the slide is correctly positioned.",
        title: "No illumination at the stage",
        remedy:
          "Check the power switch and brightness control, confirm the lamp or LED module is seated correctly, and replace the source only with approved parts.",
      },
      {
        cause:
          "Slide placement is unstable, stage clips are loose, or the specimen is not centered before magnification changes.",
        severity: "LOW",
        sourceReferenceIds: ["src_fixture_manual_stage"],
        symptoms: "The specimen drifts out of view during scanning or while changing objectives.",
        title: "Specimen drifts out of view",
        remedy:
          "Reposition the slide, secure it with the stage holder, center the specimen at low power, and then move to higher magnification.",
      },
    ]),
    manuals: Object.freeze([
      {
        accessStatus: "available",
        fileType: "PDF",
        language: "English",
        lastCheckedAt: "2026-04-03T08:00:00.000Z",
        notes: "Fixture operator guide for baseline acceptance testing.",
        sourceReferenceIds: ["src_fixture_manual_cleaning"],
        title: "Microscope operator care guide",
        url: "https://fixtures.example/manuals/microscope-operator-care-guide.pdf",
      },
      {
        accessStatus: "available",
        fileType: "PDF",
        language: "English",
        lastCheckedAt: "2026-04-03T08:00:00.000Z",
        notes: "Fixture preventive maintenance checklist.",
        sourceReferenceIds: ["src_fixture_manual_illumination", "src_fixture_manual_checklist"],
        title: "Microscope preventive maintenance checklist",
        url: "https://fixtures.example/manuals/microscope-preventive-maintenance.pdf",
      },
    ]),
    maintenanceTasks: Object.freeze([
      {
        details:
          "Inspect the body, stage, eyepieces, and power cable before each session; remove visible dust before energizing the instrument.",
        frequency: "Daily",
        label: "Perform a visual pre-use inspection",
        sourceReferenceIds: ["src_fixture_manual_cleaning"],
      },
      {
        details:
          "Clean external optical surfaces only with approved lens paper or swabs and document any scratches, fungus, or moisture ingress.",
        frequency: "Daily",
        label: "Clean optical contact surfaces",
        sourceReferenceIds: ["src_fixture_manual_cleaning"],
      },
      {
        details: "Verify lamp output, condenser travel, focus smoothness, and stage travel against the acceptance checklist.",
        frequency: "Monthly",
        label: "Check functional controls",
        sourceReferenceIds: ["src_fixture_manual_focus", "src_fixture_manual_illumination"],
      },
      {
        details:
          "Review alignment, lubrication condition where applicable, and electrical safety according to institutional biomedical engineering procedures.",
        frequency: "Quarterly",
        label: "Perform preventive maintenance review",
        sourceReferenceIds: ["src_fixture_manual_illumination"],
      },
    ]),
    manufacturers: Object.freeze([
      {
        aliases: ["Northfield"],
        models: Object.freeze([
          {
            aliases: ["Northfield CL-200"],
            equipmentTypeConfirmed: true,
            latestKnownYear: 2025,
            name: "Northfield CompoundLab 200",
            sourceReferenceIds: ["src_fixture_northfield_manual", "src_fixture_northfield_model_page"],
            summary: "A baseline laboratory microscope model used to represent entry-level brightfield work.",
          },
        ]),
        name: "Northfield Optics",
        primaryDomain: "northfield-optics.example",
        sourceReferenceIds: [
          "src_fixture_distributor_reference",
          "src_fixture_northfield_brand_page",
          "src_fixture_northfield_manual",
          "src_fixture_northfield_model_page",
        ],
      },
      {
        aliases: ["Ridgeview"],
        models: Object.freeze([
          {
            equipmentTypeConfirmed: true,
            latestKnownYear: 2024,
            name: "Ridgeview BioScope Pro",
            sourceReferenceIds: ["src_fixture_ridgeview_manual", "src_fixture_ridgeview_model_page"],
            summary:
              "A higher-specification microscope with improved illumination and imaging accessories.",
          },
        ]),
        name: "Ridgeview Scientific",
        primaryDomain: "ridgeview-scientific.example",
        sourceReferenceIds: [
          "src_fixture_distributor_reference",
          "src_fixture_ridgeview_brand_page",
          "src_fixture_ridgeview_manual",
          "src_fixture_ridgeview_model_page",
        ],
      },
      {
        aliases: ["Aperture"],
        models: Object.freeze([
          {
            equipmentTypeConfirmed: true,
            latestKnownYear: 2023,
            name: "Aperture SlideView 90",
            sourceReferenceIds: ["src_fixture_aperture_manual", "src_fixture_aperture_model_page"],
            summary: "A compact teaching-lab microscope with simplified controls.",
          },
        ]),
        name: "Aperture Scientific",
        primaryDomain: "aperture-scientific.example",
        sourceReferenceIds: [
          "src_fixture_aperture_brand_page",
          "src_fixture_aperture_manual",
          "src_fixture_aperture_model_page",
          "src_fixture_education_reference",
        ],
      },
    ]),
    mediaCandidates: Object.freeze([
      {
        alt: "Bench microscope prepared for laboratory inspection.",
        attributionText: "Fixture image metadata for baseline acceptance testing.",
        caption:
          "A laboratory microscope should be staged with stable illumination, a clean optical path, and controlled specimen handling.",
        height: 900,
        isAiGenerated: false,
        licenseType: "Fixture editorial use",
        sectionAffinity: ["featured_image"],
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference", "src_fixture_microscope_bench_image"],
        sourceUrl: "https://fixtures.example/images/microscope-bench.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as the lead microscope system visual.",
        width: 1400,
      },
      {
        alt: "Close view of microscope optics and focus controls.",
        attributionText: "Fixture image metadata for instructional illustration.",
        caption:
          "Objective selection, condenser adjustment, and deliberate focusing all affect image quality and operator safety.",
        height: 900,
        isAiGenerated: false,
        licenseType: "Fixture editorial use",
        sectionAffinity: ["components_visual_guide", "operation_visual_guide"],
        sourceDomain: "fixtures.example",
        sourceReferenceIds: ["src_fixture_image_reference", "src_fixture_microscope_optics_image"],
        sourceUrl: "https://fixtures.example/images/microscope-optics.jpg",
        storageDriver: "external-source",
        usageNotes: "Used as an inline microscope optics illustration.",
        width: 1400,
      },
    ]),
    operatingPrinciple: Object.freeze({
      sourceReferenceIds: ["src_fixture_optics_reference"],
      summary:
        "A microscope directs controlled illumination through a specimen and uses an objective-eyepiece lens system to enlarge the image for observation and interpretation.",
    }),
    safetyPrecautions: Object.freeze([
      {
        details:
          "Carry the microscope with two hands, supporting both the arm and the base to avoid stage impact or optical misalignment.",
        label: "Handle and transport the microscope carefully",
        sourceReferenceIds: ["src_fixture_manual_focus"],
      },
      {
        details:
          "Never force focus controls at high magnification because the objective can strike and damage the slide or lens.",
        label: "Avoid forcing focus at high power",
        sourceReferenceIds: ["src_fixture_manual_focus"],
      },
      {
        details:
          "Use only approved cleaning materials on optical surfaces and disconnect power before lamp replacement or deeper maintenance work.",
        label: "Use approved cleaning and electrical safety practices",
        sourceReferenceIds: ["src_fixture_manual_cleaning", "src_fixture_manual_illumination"],
      },
    ]),
    sourceReferences: Object.freeze([
      {
        id: "src_fixture_northfield_brand_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "northfield-optics.example",
        sourceType: "OFFICIAL_MANUFACTURER_WEBSITE",
        title: "Northfield Optics microscope overview",
        url: "https://northfield-optics.example/microscopes",
      },
      {
        id: "src_fixture_ridgeview_brand_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "ridgeview-scientific.example",
        sourceType: "OFFICIAL_MANUFACTURER_WEBSITE",
        title: "Ridgeview Scientific microscope systems",
        url: "https://ridgeview-scientific.example/microscope-systems",
      },
      {
        id: "src_fixture_aperture_brand_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "aperture-scientific.example",
        sourceType: "OFFICIAL_MANUFACTURER_WEBSITE",
        title: "Aperture Scientific microscope catalogue",
        url: "https://aperture-scientific.example/microscopes",
      },
      {
        id: "src_fixture_northfield_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "northfield-optics.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "Northfield CompoundLab 200",
        url: "https://northfield-optics.example/compoundlab-200",
      },
      {
        id: "src_fixture_ridgeview_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "ridgeview-scientific.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "Ridgeview BioScope Pro",
        url: "https://ridgeview-scientific.example/bioscope-pro",
      },
      {
        id: "src_fixture_aperture_model_page",
        reliabilityTier: "tier_1_official",
        sourceDomain: "aperture-scientific.example",
        sourceType: "OFFICIAL_PRODUCT_PAGE",
        title: "Aperture SlideView 90",
        url: "https://aperture-scientific.example/slideview-90",
      },
      {
        id: "src_fixture_northfield_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "northfield-optics.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Northfield CompoundLab 200 operator manual",
        url: "https://northfield-optics.example/manuals/compoundlab-200.pdf",
      },
      {
        id: "src_fixture_ridgeview_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "ridgeview-scientific.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Ridgeview BioScope Pro service guide",
        url: "https://ridgeview-scientific.example/manuals/bioscope-pro-service.pdf",
      },
      {
        id: "src_fixture_aperture_manual",
        reliabilityTier: "tier_1_official",
        sourceDomain: "aperture-scientific.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Aperture SlideView 90 quick-start guide",
        url: "https://aperture-scientific.example/manuals/slideview-90-quick-start.pdf",
      },
      {
        id: "src_fixture_manual_focus",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Microscope focusing and handling fixture note",
        url: "https://fixtures.example/manuals/microscope-focus-and-handling.pdf",
      },
      {
        id: "src_fixture_manual_illumination",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Microscope illumination maintenance fixture note",
        url: "https://fixtures.example/manuals/microscope-illumination-maintenance.pdf",
      },
      {
        id: "src_fixture_manual_cleaning",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Microscope operator care guide",
        url: "https://fixtures.example/manuals/microscope-operator-care-guide.pdf",
      },
      {
        id: "src_fixture_manual_checklist",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Microscope preventive maintenance checklist",
        url: "https://fixtures.example/manuals/microscope-preventive-maintenance.pdf",
      },
      {
        id: "src_fixture_manual_stage",
        reliabilityTier: "tier_1_official",
        sourceDomain: "fixtures.example",
        sourceType: "OFFICIAL_MANUAL",
        title: "Microscope stage handling fixture note",
        url: "https://fixtures.example/manuals/microscope-stage-handling.pdf",
      },
      {
        id: "src_fixture_distributor_reference",
        reliabilityTier: "tier_2_verified_partner",
        sourceDomain: "procurement.fixtures.example",
        sourceType: "OFFICIAL_DISTRIBUTOR_DOCUMENTATION",
        title: "Approved distributor fixture listing for microscopes",
        url: "https://procurement.fixtures.example/microscopes",
      },
      {
        id: "src_fixture_definition_reference",
        reliabilityTier: "tier_2_trusted_reference",
        sourceDomain: "nih.gov",
        sourceType: "TRUSTED_BIOMEDICAL_REFERENCE",
        title: "Microscope fundamentals fixture reference",
        url: "https://nih.gov/fixtures/microscope-fundamentals",
      },
      {
        id: "src_fixture_optics_reference",
        reliabilityTier: "tier_2_trusted_reference",
        sourceDomain: "medlineplus.gov",
        sourceType: "TRUSTED_BIOMEDICAL_REFERENCE",
        title: "Optical magnification fixture reference",
        url: "https://medlineplus.gov/fixtures/microscope-optics",
      },
      {
        id: "src_fixture_components_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "biology.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Microscope components fixture teaching note",
        url: "https://biology.example.edu/fixtures/microscope-components",
      },
      {
        id: "src_fixture_education_reference",
        reliabilityTier: "tier_3_contextual",
        sourceDomain: "microscopy.example.edu",
        sourceType: "REPUTABLE_EDUCATIONAL_INSTITUTION",
        title: "Microscope teaching applications fixture note",
        url: "https://microscopy.example.edu/fixtures/teaching-applications",
      },
      {
        id: "src_fixture_image_reference",
        reliabilityTier: "tier_4_discovery_only",
        sourceDomain: "fixtures.example",
        sourceType: "APPROVED_SEARCH_RESULT",
        title: "Fixture microscope imagery source",
        url: "https://fixtures.example/images/microscope-image-license",
      },
      {
        id: "src_fixture_microscope_bench_image",
        reliabilityTier: "tier_4_discovery_only",
        sourceDomain: "fixtures.example",
        sourceType: "APPROVED_SEARCH_RESULT",
        title: "fixtures.example",
        url: "https://fixtures.example/images/microscope-bench.jpg",
      },
      {
        id: "src_fixture_microscope_optics_image",
        reliabilityTier: "tier_4_discovery_only",
        sourceDomain: "fixtures.example",
        sourceType: "APPROVED_SEARCH_RESULT",
        title: "fixtures.example",
        url: "https://fixtures.example/images/microscope-optics.jpg",
      },
    ]),
    uses: Object.freeze([
      {
        details:
          "Microscopes support routine specimen review in histology, microbiology, hematology, and general teaching laboratories.",
        label: "Clinical and laboratory specimen review",
        sourceReferenceIds: ["src_fixture_definition_reference", "src_fixture_education_reference"],
      },
      {
        details:
          "Teaching laboratories use microscopes to demonstrate optics, specimen handling, and systematic observation techniques.",
        label: "Education and skills training",
        sourceReferenceIds: ["src_fixture_education_reference"],
      },
    ]),
    variants: Object.freeze([
      {
        details:
          "Compound microscopes are commonly used for transmitted-light viewing of thin specimens and are typical in clinical teaching settings.",
        label: "Compound microscopes",
        sourceReferenceIds: ["src_fixture_definition_reference"],
      },
      {
        details:
          "Stereo microscopes provide lower magnification but improved depth perception for gross inspection and sample preparation.",
        label: "Stereo microscopes",
        sourceReferenceIds: ["src_fixture_education_reference"],
      },
      {
        details:
          "Inverted and fluorescence variants adapt illumination and specimen positioning for specialized workflows.",
        label: "Specialized variants",
        sourceReferenceIds: ["src_fixture_education_reference"],
      },
    ]),
  }),
});
