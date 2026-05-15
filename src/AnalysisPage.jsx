import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  Cross,
  Cpu,
  HeartPulse,
  Network,
  ScanLine,
  Waves,
  Upload,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye,
  BarChart3,
  Shield,
  Thermometer,
  FlaskConical,
  Stethoscope,
  CalendarClock,
  ListChecks,
  TrendingUp,
  TriangleAlert,
  UserCircle,
  LogOut,
  Download,
  FileText,
  ClipboardList,
  CircleHelp,
  History,
  Info,
  MessageSquare,
  Settings,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { clearLocalSession, getLocalSession, supabase } from "./supabaseClient.js";
import heroBg from "./analysis_hero_bg.png";
import uploadArt from "./upload_zone_art.png";
import xrayImg from "./xray_scan.png";
import mriImg from "./mri_brain.png";
import ctImg from "./ct_scan.png";

// â”€â”€ Floating icon data (same icons as landing page) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const floatingIcons = [
  { Icon: BrainCircuit, className: "left-[6%] top-[14%]",   depth: 22  },
  { Icon: ScanLine,     className: "right-[10%] top-[16%]", depth: -16 },
  { Icon: Activity,     className: "left-[14%] bottom-[20%]",depth: 28  },
  { Icon: Cpu,          className: "right-[16%] bottom-[22%]",depth: -24},
  { Icon: HeartPulse,   className: "left-[46%] top-[10%]",  depth: 12  },
  { Icon: Cross,        className: "right-[6%] top-[50%]",  depth: 18  },
  { Icon: Network,      className: "left-[4%] top-[56%]",   depth: -20 },
  { Icon: Waves,        className: "right-[44%] bottom-[10%]",depth: 16 },
];

// â”€â”€ Fake scan results for demo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const demoResults = [
  { label: "Abnormality Confidence",  value: "97.4%", icon: AlertTriangle, color: "rgba(255,180,80,0.9)",  glow: "rgba(255,160,40,0.4)"  },
  { label: "Diagnostic Clarity",      value: "High",  icon: Eye,           color: "rgba(92,236,255,0.9)",  glow: "rgba(92,236,255,0.4)"  },
  { label: "Review Acceleration",     value: "4.8x",  icon: Zap,           color: "rgba(160,100,255,0.9)", glow: "rgba(140,80,255,0.35)" },
  { label: "Scan Integrity",          value: "Clear", icon: Shield,        color: "rgba(100,230,140,0.9)", glow: "rgba(80,210,120,0.35)" },
  { label: "Neural Map Coverage",     value: "94.1%", icon: BarChart3,     color: "rgba(92,236,255,0.9)",  glow: "rgba(92,236,255,0.4)"  },
  { label: "Region Flagged",          value: "L-FTL", icon: BrainCircuit,  color: "rgba(255,120,120,0.9)", glow: "rgba(255,80,80,0.35)"  },
];

const scanTypes = ["X-Ray", "MRI", "CT Scan", "PET Scan", "Ultrasound"];

// Maps scan type â†’ preview image
const scanPreviews = {
  "X-Ray":      xrayImg,
  "MRI":        mriImg,
  "CT Scan":    ctImg,
  "PET Scan":   mriImg,   // reuse closest visual
  "Ultrasound": ctImg,
};

// Sample gallery items
const sampleScans = [
  { label: "Limb X-Ray",      tag: "X-Ray",   img: xrayImg, finding: "Region triage ready" },
  { label: "Brain MRI",       tag: "MRI",     img: mriImg,  finding: "Tumor-class triage ready" },
  { label: "Chest CT",        tag: "CT Scan", img: ctImg,   finding: "Lung CT triage ready" },
];

const modalityGuides = [
  {
    title: "X-Ray",
    icon: ScanLine,
    image: xrayImg,
    summary:
      "X-rays use a small amount of ionizing radiation to make fast two-dimensional images of bones and dense body structures. They are commonly used first when a clinician suspects fractures, dislocations, chest infection patterns, arthritis, or foreign bodies.",
    strengths: ["Very quick and widely available", "Excellent for bones and joint alignment", "Useful for follow-up comparison after treatment"],
    limitations: ["Soft tissues are less detailed than MRI or CT", "Small occult fractures may be missed", "Radiologist review is still required for final reporting"],
  },
  {
    title: "MRI",
    icon: BrainCircuit,
    image: mriImg,
    summary:
      "MRI uses powerful magnets and radio waves, not X-ray radiation, to create detailed images of soft tissues. It is especially useful for brain, spine, joints, tumors, nerves, ligaments, and subtle tissue changes that may not appear clearly on X-ray.",
    strengths: ["Best soft-tissue detail among common scans", "Helpful for tumor and nerve-related assessment", "Can show inflammation, edema, and tissue contrast"],
    limitations: ["Takes longer than X-ray or CT", "Not suitable for some metal implants", "Single uploaded slices cannot replace the full MRI series"],
  },
  {
    title: "CT Scan",
    icon: Activity,
    image: ctImg,
    summary:
      "CT scans use rotating X-rays and computer reconstruction to create cross-sectional images. They are valuable for head injury, chest disease, lung lesions, internal bleeding, complex fractures, abdominal conditions, and urgent triage because they are fast and detailed.",
    strengths: ["Fast cross-sectional imaging", "Strong detail for lungs, bone, and acute trauma", "Can be enhanced with contrast when needed"],
    limitations: ["Uses more radiation than standard X-ray", "Contrast may not be suitable for every patient", "Findings must be matched with symptoms and prior imaging"],
  },
];

const dashboardCards = [
  {
    title: "Help",
    icon: CircleHelp,
    body: "Upload a clear scan image, choose the scan type if known, then start analysis. Use the PDF report for a structured review summary.",
    highlights: ["Accepted scans: X-ray, MRI, CT, PET, Ultrasound", "Use the gallery to test sample scans instantly", "Download the PDF report after analysis completes"],
    stats: [
      { label: "Upload", value: "Ready" },
      { label: "Report", value: "PDF" },
      { label: "Safety", value: "Clinical review" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    body: "Current defaults use automatic modality routing, confidence display, PDF export, and clinical safety notes for every analysis.",
    highlights: ["Automatic scan-type detection is enabled", "Confidence, severity, and heatmap output are shown when available", "X-ray model training now uses dataset/x-ray/balanced_train by default"],
    stats: [
      { label: "Routing", value: "Auto" },
      { label: "X-ray data", value: "balanced_train" },
      { label: "Export", value: "Enabled" },
    ],
  },
  {
    title: "About",
    icon: Info,
    body: "MedAI Diagnostics is a student clinical AI interface for triage support across X-ray, MRI, and CT image workflows.",
    highlights: ["Supports modality-aware reporting", "Shows model confidence and safety limitations", "Designed as an educational diagnostic assistant"],
    stats: [
      { label: "Models", value: "3" },
      { label: "Mode", value: "Triage" },
      { label: "Use", value: "Education" },
    ],
  },
  {
    title: "Feedback",
    icon: MessageSquare,
    body: "Record incorrect modality detection, unclear reports, or missing clinical context so the model workflow can be improved.",
    highlights: ["Check whether the detected scan type matches the upload", "Note unclear heatmaps or low-confidence reports", "Use history to compare recent outputs"],
    stats: [
      { label: "Review", value: "Manual" },
      { label: "History", value: "Local" },
      { label: "Status", value: "Open" },
    ],
  },
];

const dashboardTabs = [
  ...dashboardCards,
  { title: "History", icon: History, body: "Recent scan activity saved in this browser." },
];

// â”€â”€ Per-scan-type diagnostic report data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Scanning animation log lines â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const scanLog = [
  "Initialising neural imaging pipeline...",
  "Loading ResNet-152 backbone weights...",
  "Preprocessing DICOM metadata...",
  "Applying contrast normalisation...",
  "Running anomaly detection pass 1/3...",
  "Running anomaly detection pass 2/3...",
  "Running anomaly detection pass 3/3...",
  "Generating heatmap overlay...",
  "Cross-referencing diagnostic database...",
  "Compiling confidence scores...",
  "Analysis complete",
];

const apiScanLog = [
  "Initialising neural imaging pipeline...",
  "Loading trained modality router and diagnostic model...",
  "Preprocessing uploaded image...",
  "Running modality detection...",
  "Routing scan to specialist model...",
  "Running abnormality inference...",
  "Generating heatmap overlay...",
  "Compiling modality-aware clinical summary...",
  "Analysis complete",
];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const normalizeScanType = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("mri")) return "MRI";
  if (normalized.includes("ct")) return "CT Scan";
  if (normalized.includes("x")) return "X-Ray";
  return "X-Ray";
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const isNormalPrediction = (prediction) => {
  const normalized = String(prediction || "").toLowerCase();
  return normalized.includes("normal") || normalized.includes("negative") || normalized.includes("no acute") || normalized.includes("notumor") || normalized.includes("no tumor");
};

const isXrayRegionPrediction = (prediction) => {
  const normalized = String(prediction || "").toLowerCase();
  return normalized.startsWith("xr ") || normalized.startsWith("xr_") || normalized.endsWith("x-ray region");
};

const getXrayRegionName = (prediction) => {
  const normalized = String(prediction || "")
    .replace(/x[-\s]?ray region/gi, "")
    .replace(/possible/gi, "")
    .replace(/bone/gi, "")
    .replace(/crack/gi, "")
    .replace(/damage/gi, "")
    .replace(/or/gi, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "bone";
  if (normalized.toLowerCase().includes("forearm")) return "arm";
  if (normalized.toLowerCase().includes("legfoot")) return "foot";
  if (normalized.toLowerCase().includes("legknee")) return "knee";
  return titleCase(normalized);
};

const getXrayRegionGuide = (region) => {
  const key = String(region || "").toLowerCase();
  if (key.includes("foot")) {
    return {
      label: "Foot",
      area: "metatarsals, toes, heel, and ankle-adjacent bones",
      signs: "localized foot pain, swelling, bruising, limping, or pain while standing",
      avoid: "weight-bearing, running, jumping, or tight footwear",
      views: "AP, oblique, and lateral foot views; ankle views if pain is near the joint",
      pathway: "protective immobilization, non-weight-bearing support, and orthopedic review if a fracture line is suspected",
      followUp: "urgent radiology review; repeat X-ray in 7-10 days if pain persists and the first image is unclear",
    };
  }
  if (key.includes("knee")) {
    return {
      label: "Knee",
      area: "distal femur, proximal tibia, fibula head, patella, and joint alignment",
      signs: "knee swelling, inability to bend fully, instability, direct trauma, or pain while walking",
      avoid: "twisting, squatting, stairs, sports, or unsupported walking",
      views: "AP, lateral, skyline, and weight-bearing views when clinically appropriate",
      pathway: "knee immobilizer or support, neurovascular check, and orthopedic review for suspected fracture or dislocation",
      followUp: "urgent radiology or orthopedic review, especially if swelling or inability to bear weight is present",
    };
  }
  if (key.includes("hand")) {
    return {
      label: "Hand",
      area: "phalanges, metacarpals, carpal alignment, and visible joint spaces",
      signs: "finger deformity, swelling, grip weakness, point tenderness, or pain after impact/crush injury",
      avoid: "gripping, lifting, forceful finger movement, or returning to sports too early",
      views: "PA, oblique, and lateral hand views; dedicated finger views for focal pain",
      pathway: "splint the painful finger/hand position and arrange radiology or hand-specialist review",
      followUp: "urgent radiology review; hand-specialist review if deformity, rotation, numbness, or tendon injury is suspected",
    };
  }
  return {
    label: "Arm",
    area: "forearm shafts, wrist/elbow alignment, radius, ulna, and adjacent joints",
    signs: "arm pain, swelling, limited rotation, tenderness after fall, or visible deformity",
    avoid: "lifting, pushing, pulling, sports, or rotating the forearm forcefully",
    views: "AP and lateral forearm views including wrist and elbow; dedicated joint views if pain localizes",
    pathway: "support with sling or splint, check circulation/sensation, and escalate suspected radius or ulna fracture",
    followUp: "urgent radiology review; orthopedic review if deformity, severe pain, or reduced circulation/sensation is present",
  };
};

const getMriGuide = (prediction) => {
  const normalized = String(prediction || "").toLowerCase();
  if (normalized.includes("meningioma")) {
    return {
      condition: "Possible Meningioma Pattern on Brain MRI",
      area: "extra-axial/dural-based brain region",
      findings: ["Pattern may represent a dural-based mass; contrast MRI helps define attachment and enhancement.", "Assess for mass effect, edema, seizure symptoms, headache, or focal neurologic deficit."],
      pathway: "neurosurgery or neurology review with full MRI series and contrast correlation",
    };
  }
  if (normalized.includes("glioma")) {
    return {
      condition: "Possible Glioma Pattern on Brain MRI",
      area: "intra-axial brain parenchyma",
      findings: ["Pattern may represent infiltrative brain tissue change; grade cannot be decided from one image.", "Review FLAIR/T2 signal, contrast enhancement, edema, and neurologic symptoms."],
      pathway: "urgent neuro-oncology or neurosurgery review with complete MRI protocol",
    };
  }
  if (normalized.includes("pituitary")) {
    return {
      condition: "Possible Pituitary Lesion Pattern on MRI",
      area: "sellar and suprasellar region",
      findings: ["Pattern may involve the pituitary area; correlate with vision symptoms and endocrine labs.", "Dedicated pituitary MRI views may be needed for size and optic chiasm relation."],
      pathway: "endocrinology plus neurosurgery review if visual symptoms, hormonal change, or mass effect is present",
    };
  }
  return {
    condition: "Brain MRI Review Finding",
    area: "brain soft-tissue structures",
    findings: ["MRI findings need the complete sequence set, not a single uploaded slice.", "Correlate with symptoms, contrast behavior, prior imaging, and radiologist review."],
    pathway: "radiology and specialist review based on symptoms and full MRI series",
  };
};

const getCtGuide = (prediction) => {
  const normalized = String(prediction || "").toLowerCase();
  if (normalized.includes("adenocarcinoma")) {
    return {
      condition: "Possible Lung Adenocarcinoma Pattern on CT",
      area: "lung parenchyma or focal pulmonary lesion",
      findings: ["Suspicious lung lesion pattern needs full chest CT review, nodule size measurement, and comparison with prior scans.", "Assess margins, ground-glass opacity, solid component, lymph nodes, and clinical risk factors."],
      pathway: "pulmonology or oncology review; contrast CT, PET-CT, or biopsy may be considered by specialists",
    };
  }
  if (normalized.includes("squamous")) {
    return {
      condition: "Possible Squamous Cell Carcinoma Pattern on CT",
      area: "central airway or lung lesion region",
      findings: ["Pattern can be associated with central lung lesions; check airway narrowing, cavitation, and lymph nodes.", "Clinical history such as smoking exposure, cough, chest pain, or hemoptysis matters."],
      pathway: "pulmonology review with complete CT series and possible bronchoscopy pathway if confirmed",
    };
  }
  if (normalized.includes("benign")) {
    return {
      condition: "Benign-Appearing CT Pattern Requiring Correlation",
      area: "visible CT region",
      findings: ["Model output suggests a lower-risk pattern, but size, growth, calcification, and prior scans must be checked.", "Stable benign-appearing lesions may still require interval follow-up."],
      pathway: "routine radiology review with follow-up interval based on lesion size and risk factors",
    };
  }
  return {
    condition: "CT Abnormality Review Finding",
    area: "CT-visible anatomy",
    findings: ["CT interpretation requires the full series, window settings, and clinical context.", "Compare with prior imaging and symptoms before deciding severity."],
    pathway: "radiology review and specialist referral if the finding remains suspicious",
  };
};

const urgencyFromSeverity = (severity, prediction) => {
  if (isNormalPrediction(prediction)) return "low";
  if (isXrayRegionPrediction(prediction)) return "medium";
  const normalized = String(severity || "").toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("moderate") || normalized.includes("medium")) return "medium";
  return "low";
};

const damageFromResult = (result) => {
  if (!result || isNormalPrediction(result.prediction)) return 6;
  const base = Math.round(Number(result.confidence || 0) * 0.62);
  if (isXrayRegionPrediction(result.prediction)) return Math.min(64, Math.max(38, base));
  if (String(result.severity || "").toLowerCase().includes("high")) return Math.min(88, Math.max(46, base));
  if (String(result.severity || "").toLowerCase().includes("moderate")) return Math.min(58, Math.max(24, base));
  return Math.min(35, Math.max(12, base));
};

const formatDateTime = (date = new Date()) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const getDisplayName = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split("@")[0] ||
  "Clinical User";

const getUserProfileDetails = (user) => {
  const metadata = user?.user_metadata || {};
  return [
    { label: "Email ID", value: user?.email || "Not available" },
    { label: "Full Name", value: metadata.full_name || metadata.name || getDisplayName(user) },
    { label: "Provider", value: user?.app_metadata?.provider || "email" },
    { label: "User ID", value: user?.id || "Local session" },
    { label: "Role", value: user?.role || "authenticated" },
    { label: "Last Sign In", value: user?.last_sign_in_at ? formatDateTime(new Date(user.last_sign_in_at)) : "Current session" },
  ];
};

const buildSupplementalAnalysis = (result, report, file, scanType) => {
  const confidence = Number(result?.confidence || 0);
  const normalizedScan = normalizeScanType(result?.scan_type || scanType);
  const prediction = result?.prediction || "";
  const xrayGuide = normalizedScan === "X-Ray" ? getXrayRegionGuide(getXrayRegionName(result?.detected_abnormality || prediction)) : null;
  const mriGuide = normalizedScan === "MRI" ? getMriGuide(prediction) : null;
  const ctGuide = normalizedScan === "CT Scan" ? getCtGuide(prediction) : null;
  const guide = xrayGuide || mriGuide || ctGuide;
  const fileSize = file?.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Not available";
  const confidenceBand = confidence >= 90 ? "High reliability band" : confidence >= 75 ? "Review recommended band" : "Low confidence band";
  const reviewPriority =
    report.urgency === "high" ? "Same-day specialist review" :
    report.urgency === "medium" ? "Priority clinical review" :
    "Routine clinical review";

  return {
    summary: [
      { label: "Model Output", value: titleCase(result?.prediction || "Pending") },
      { label: "Detected Modality", value: normalizedScan },
      { label: "Confidence Band", value: confidenceBand },
      { label: "Review Priority", value: reviewPriority },
    ],
    imageQuality: [
      `File analysed: ${file?.name || "Uploaded image"}`,
      `Estimated file size: ${fileSize}`,
      normalizedScan === "X-Ray"
        ? `X-ray review focused on the ${guide?.label || "bone"} region: ${guide?.area || "visible bone and joint alignment"}.`
        : normalizedScan === "MRI"
          ? `MRI review focused on ${guide?.area || "soft-tissue detail"} and sequence-dependent abnormality patterns.`
          : `CT review focused on ${guide?.area || "cross-sectional anatomy"} and lesion-pattern triage.`,
      "Image preprocessing included resizing, normalization, orientation-safe loading, and modality-aware routing.",
    ],
    clinicalContext: [
      `Urgency level: ${report.urgency.toUpperCase()}`,
      `Follow-up recommendation: ${report.followUp}`,
      normalizedScan === "X-Ray"
        ? `Match the result with symptoms such as ${guide?.signs || "localized pain, swelling, deformity, or reduced movement"}.`
        : normalizedScan === "MRI"
          ? "Match the result with neurologic symptoms, contrast enhancement, full MRI sequence set, and prior imaging."
          : "Match the result with symptoms, CT window settings, lesion size, prior imaging, and laboratory or clinical risk data.",
      `Suggested pathway: ${guide?.pathway || "qualified radiology review before clinical decisions"}.`,
    ],
    limitations: [
      normalizedScan === "X-Ray"
        ? `A single ${guide?.label?.toLowerCase() || "bone"} X-ray image may miss subtle, non-displaced, growth-plate, or occult fractures.`
        : normalizedScan === "MRI"
          ? "A single MRI image may miss lesions visible only on another sequence, plane, or contrast phase."
          : "A single CT image may miss findings visible only on another slice, window, or contrast phase.",
      "Low-quality, cropped, rotated, incomplete, or non-medical images can reduce accuracy.",
      "The model cannot replace radiology interpretation, emergency care, or specialist clinical judgement.",
    ],
  };
};

const buildResultCards = (result) => {
  if (!result) return demoResults;
  const confidence = Number(result.confidence || 0);
  const severity = result.severity || (confidence > 90 ? "High" : confidence > 70 ? "Moderate" : "Low");
  const prediction = result.prediction || "Pending";
  const urgency = urgencyFromSeverity(severity, prediction);
  const findingLabel = isNormalPrediction(prediction)
    ? "No Major Finding"
    : isXrayRegionPrediction(prediction)
      ? `Possible ${getXrayRegionName(prediction)} Crack`
    : prediction.toLowerCase().includes("indeterminate")
      ? "Possible Injury"
      : titleCase(prediction).replace(/\s+/g, " ").slice(0, 24);
  return [
    { label: "Model Confidence", value: `${confidence.toFixed(1)}%`, icon: AlertTriangle, color: confidence >= 80 ? "rgba(100,230,140,0.9)" : "rgba(255,180,80,0.9)", glow: confidence >= 80 ? "rgba(80,210,120,0.35)" : "rgba(255,160,40,0.4)" },
    { label: "Detected Modality", value: normalizeScanType(result.scan_type), icon: Eye, color: "rgba(92,236,255,0.9)", glow: "rgba(92,236,255,0.4)" },
    { label: "Severity", value: severity, icon: Zap, color: urgency === "high" ? "rgba(255,100,100,0.9)" : urgency === "medium" ? "rgba(255,180,80,0.9)" : "rgba(100,230,140,0.9)", glow: "rgba(92,236,255,0.25)" },
    { label: "Scan Integrity", value: "Clear", icon: Shield, color: "rgba(100,230,140,0.9)", glow: "rgba(80,210,120,0.35)" },
    { label: "Processing Time", value: result.processing_time || "Ready", icon: BarChart3, color: "rgba(92,236,255,0.9)", glow: "rgba(92,236,255,0.4)" },
    { label: "AI Finding", value: findingLabel, icon: BrainCircuit, color: isNormalPrediction(prediction) ? "rgba(100,230,140,0.9)" : "rgba(255,120,120,0.9)", glow: "rgba(255,80,80,0.25)" },
  ];
};

const buildClinicalReport = (result, fallbackScanType) => {
  const scan = normalizeScanType(result?.scan_type || fallbackScanType);
  const prediction = titleCase(result?.prediction || "Analysis Pending");
  const abnormality = titleCase(result?.detected_abnormality || prediction);
  const confidence = Number(result?.confidence || 0);
  const urgency = urgencyFromSeverity(result?.severity, prediction);
  const damagePercent = damageFromResult(result);
  const noMajorFinding = isNormalPrediction(prediction);
  const xrayRegionOnly = isXrayRegionPrediction(result?.prediction) || isXrayRegionPrediction(abnormality);

  if (scan === "X-Ray") {
    const indeterminateXray = prediction.toLowerCase().includes("indeterminate");
    const reportUrgency = xrayRegionOnly ? "medium" : urgency;
    const needsReview = !noMajorFinding && reportUrgency !== "low";
    const regionName = getXrayRegionName(abnormality || prediction);
    const guide = getXrayRegionGuide(regionName);
    return {
      condition: xrayRegionOnly
        ? `Possible ${guide.label} Bone Damage or Small Crack`
        : indeterminateXray
          ? "Possible Musculoskeletal Injury Requiring Review"
        : noMajorFinding
          ? "No Acute Musculoskeletal X-ray Abnormality Detected"
          : `${abnormality} on Musculoskeletal X-ray`,
      icd: noMajorFinding ? "Z03.89" : "R93.7",
      damagePercent,
      urgency: reportUrgency,
      hasStages: false,
      findings: xrayRegionOnly
        ? [
            `AI flagged the ${guide.label.toLowerCase()} X-ray area with ${confidence.toFixed(1)}% confidence.`,
            `Review focus: ${guide.area}.`,
            `Treat this as possible ${guide.label.toLowerCase()} bone damage, small crack, fracture line, or alignment abnormality until reviewed.`,
            `Recommended views: ${guide.views}.`,
          ]
        : noMajorFinding
        ? [
            `AI confidence ${confidence.toFixed(1)}% for no major radiographic abnormality.`,
            "No model-level evidence of acute fracture or dislocation in the uploaded X-ray.",
            "Alignment and visible cortical margins should still be confirmed by a radiologist.",
            "If pain persists, occult fracture or soft-tissue injury may require follow-up imaging.",
          ]
        : [
            `AI model detected an abnormal musculoskeletal X-ray pattern with ${confidence.toFixed(1)}% confidence.`,
            needsReview
              ? "This confidence is below the 90% target for ruling out injury, so the case is treated as possible fracture or alignment abnormality."
              : "Finding is consistent with possible fracture, dislocation, post-traumatic change, or focal osseous abnormality.",
            "The uploaded image should be reviewed with patient history, pain location, and dedicated radiographic views.",
            "This report is limb-X-ray aware and will not generate pneumonia guidance for elbow, wrist, hand, or shoulder studies.",
          ],
      precautions: xrayRegionOnly
        ? [
            `Protect the ${guide.label.toLowerCase()} and avoid ${guide.avoid} until clinician review.`,
            "Do not treat this result as all clear when pain, swelling, deformity, or restricted movement is present.",
            `Symptoms to mention: ${guide.signs}.`,
            "Use splinting or immobilization only under appropriate medical guidance.",
          ]
        : noMajorFinding
        ? [
            "Use clinical judgement if focal pain, swelling, or reduced range of motion persists.",
            "Avoid high-impact activity until symptoms improve or a clinician clears the joint.",
            "Seek urgent care for numbness, deformity, increasing swelling, or severe pain.",
          ]
        : [
            "Immobilize or protect the painful region until clinician review.",
            "Avoid weight-bearing or forceful movement involving the affected limb.",
            "Seek urgent care for deformity, neurovascular symptoms, or rapidly increasing swelling.",
            "Do not rely on AI output alone for fracture exclusion or treatment decisions.",
      ],
      treatment: [
        { step: "Radiologist Review", detail: xrayRegionOnly ? `Confirm ${guide.label.toLowerCase()} view adequacy and exact bone involved` : "Confirm abnormality, view adequacy, and exact anatomical region", icon: Stethoscope },
        { step: "Dedicated Views", detail: xrayRegionOnly ? guide.views : "Repeat orthogonal or comparison views if clinically required", icon: ScanLine },
        { step: "Orthopedic Pathway", detail: xrayRegionOnly ? guide.pathway : "Escalate suspected fracture/dislocation for splinting or reduction", icon: ListChecks },
        { step: "Follow-up Imaging", detail: "Repeat X-ray or MRI if occult injury remains suspected", icon: CalendarClock },
      ],
      followUp: noMajorFinding ? "as clinically indicated" : guide.followUp,
    };
  }

  if (scan === "MRI") {
    const noTumor = noMajorFinding || prediction.toLowerCase().includes("notumor");
    const guide = getMriGuide(prediction);
    return {
      condition: noTumor ? "No Brain Tumor Pattern Detected on MRI" : guide.condition,
      icd: noTumor ? "Z03.89" : "D49.6",
      damagePercent,
      urgency,
      hasStages: !noTumor,
      stageIndex: urgency === "high" ? 2 : 1,
      stages: [
        { label: "Low Signal", desc: "Small/localized feature burden", color: "rgba(100,230,140,0.9)" },
        { label: "Moderate", desc: "Focal lesion pattern requiring specialist review", color: "rgba(92,236,255,0.9)" },
        { label: "High", desc: "Strong tumor-like signal with elevated confidence", color: "rgba(255,180,80,0.9)" },
        { label: "Critical", desc: "Mass effect/urgent clinical concern suspected", color: "rgba(255,100,100,0.9)" },
      ],
      findings: noTumor
        ? [
            `AI confidence ${confidence.toFixed(1)}% for no tumor class on the uploaded MRI.`,
            "No model-level tumor pattern was flagged in the analyzed slice.",
            "Clinical symptoms or subtle lesions still require radiologist interpretation.",
          ]
        : [
            `AI model classified the MRI as ${prediction} with ${confidence.toFixed(1)}% confidence.`,
            `Review focus: ${guide.area}.`,
            ...guide.findings,
            "Model output identifies class probability, not a final histopathological diagnosis.",
          ],
      precautions: [
        "Escalate urgent symptoms such as new seizure, severe headache, weakness, or vision change.",
        "Do not delay neurologist/radiologist review when tumor-like findings are flagged.",
        "Use the complete MRI study, not one image alone, for clinical decisions.",
      ],
      treatment: [
        { step: "Radiology Review", detail: "Confirm lesion class, location, enhancement, and mass effect", icon: Stethoscope },
        { step: "Contrast MRI", detail: "Use contrast or advanced sequences if clinically required", icon: FlaskConical },
        { step: "Neuro Referral", detail: noTumor ? "Specialist review if symptoms persist despite no tumor-class output" : guide.pathway, icon: BrainCircuit },
        { step: "Follow-up MRI", detail: "Interval imaging based on specialist recommendation", icon: CalendarClock },
      ],
      followUp: noTumor ? "routine review" : "1-4 weeks",
    };
  }

  const normalCt = noMajorFinding;
  const ctGuide = getCtGuide(prediction);
  return {
    condition: normalCt ? "No Major CT Abnormality Detected" : ctGuide.condition,
    icd: normalCt ? "Z03.89" : "R91.8",
    damagePercent,
    urgency,
    hasStages: !normalCt,
    stageIndex: urgency === "high" ? 2 : 1,
    stages: [
      { label: "Low", desc: "Limited suspicious CT signal", color: "rgba(100,230,140,0.9)" },
      { label: "Moderate", desc: "Focal suspicious finding requiring review", color: "rgba(92,236,255,0.9)" },
      { label: "High", desc: "Strong abnormal CT class probability", color: "rgba(255,180,80,0.9)" },
      { label: "Critical", desc: "Urgent clinical correlation required", color: "rgba(255,100,100,0.9)" },
    ],
    findings: normalCt
      ? [
          `AI confidence ${confidence.toFixed(1)}% for normal CT class.`,
          "No major model-level lesion pattern was detected in the uploaded CT image.",
          "Radiologist review remains required for final interpretation.",
        ]
      : [
          `AI model classified the CT image as ${prediction} with ${confidence.toFixed(1)}% confidence.`,
          `Review focus: ${ctGuide.area}.`,
          ...ctGuide.findings,
        ],
    precautions: [
      "Do not treat AI output as a final diagnosis.",
      "Escalate respiratory distress, hemoptysis, severe pain, or rapidly worsening symptoms.",
      "Use specialist review before any invasive diagnostic or treatment pathway.",
    ],
    treatment: [
      { step: "Radiologist Review", detail: "Confirm CT pattern and anatomical localization", icon: Stethoscope },
      { step: "Clinical Correlation", detail: "Compare with symptoms, labs, and prior imaging", icon: FlaskConical },
      { step: "Specialist Referral", detail: normalCt ? "Specialist referral only if symptoms or prior imaging remain concerning" : ctGuide.pathway, icon: Thermometer },
      { step: "Follow-up CT", detail: "Repeat or contrast CT according to specialist guidance", icon: CalendarClock },
    ],
    followUp: normalCt ? "routine review" : "2-6 weeks",
  };
};

export default function AnalysisPage() {
  const navigate = useNavigate();
  const cursorRef      = useRef({ x: 0, y: 0 });
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [scanType, setScanType]   = useState("MRI");
  const [phase, setPhase]         = useState("idle"); // idle | scanning | done
  const [logLines, setLogLines]   = useState([]);
  const [progress, setProgress]   = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState("Help");
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("medai_analysis_history") || "[]");
    } catch {
      return [];
    }
  });
  const dropRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || getLocalSession()?.user || null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user || getLocalSession()?.user || null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (phase !== "done" || !analysisResult) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      scanType,
      prediction: titleCase(analysisResult.prediction || "Analysis Complete"),
      confidence: Number(analysisResult.confidence || 0).toFixed(1),
      fileName: file?.name || "Sample scan",
      createdAt: formatDateTime(),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 6);
      window.localStorage.setItem("medai_analysis_history", JSON.stringify(next));
      return next;
    });
  }, [analysisResult, file?.name, phase, scanType]);

  // â”€â”€ Smooth cursor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const dot  = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    const DOT_LERP = 0.18, RING_LERP = 0.08;
    const HALF_DOT = 3.5, HALF_RING = 19;
    let mX = -200, mY = -200, dX = -200, dY = -200, rX = -200, rY = -200;
    let raf;
    const lerp = (a, b, t) => a + (b - a) * t;
    const onMove = (e) => { mX = e.clientX; mY = e.clientY; };
    const tick = () => {
      dX = lerp(dX, mX, DOT_LERP); dY = lerp(dY, mY, DOT_LERP);
      rX = lerp(rX, mX, RING_LERP); rY = lerp(rY, mY, RING_LERP);
      if (dot)  dot.style.transform  = `translate(${dX - HALF_DOT}px,${dY - HALF_DOT}px)`;
      if (ring) ring.style.transform = `translate(${rX - HALF_RING}px,${rY - HALF_RING}px)`;
      document.documentElement.style.setProperty("--pointer-x", ((mX / window.innerWidth - 0.5) * 2).toFixed(4));
      document.documentElement.style.setProperty("--pointer-y", ((mY / window.innerHeight - 0.5) * 2).toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  // â”€â”€ Drag & Drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase("idle");
    setLogLines([]);
    setProgress(0);
    setAnalysisResult(null);
    setAnalysisError("");
  };

  const onDrop = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove("drag-over");
    handleFile(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => { e.preventDefault(); dropRef.current?.classList.add("drag-over"); };
  const onDragLeave = () => dropRef.current?.classList.remove("drag-over");

  const loadSampleScan = async ({ label, tag, img }) => {
    const response = await fetch(img);
    const blob = await response.blob();
    const sampleFile = new File([blob], `${label.replace(/\s+/g, "_").toLowerCase()}.png`, {
      type: blob.type || "image/png",
    });
    setScanType(tag);
    setPreview(img);
    setFile(sampleFile);
    setPhase("idle");
    setLogLines([]);
    setProgress(0);
    setAnalysisResult(null);
    setAnalysisError("");
  };

  // â”€â”€ API-backed scanning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const runScan = async () => {
    if (!file) return;
    setPhase("scanning");
    setLogLines([]);
    setProgress(0);
    setAnalysisResult(null);
    setAnalysisError("");

    let logIndex = 0;
    const logTimer = window.setInterval(() => {
      const nextLine = apiScanLog[Math.min(logIndex, apiScanLog.length - 2)];
      setLogLines((prev) => (prev.includes(nextLine) ? prev : [...prev, nextLine]));
      setProgress(Math.min(88, Math.round(((logIndex + 1) / apiScanLog.length) * 100)));
      logIndex += 1;
    }, 360);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("scan_type", scanType);
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "The analysis service could not process this image.");
      }

      const result = await response.json();
      const detectedScanType = normalizeScanType(result.scan_type);
      window.clearInterval(logTimer);
      setAnalysisResult(result);
      setScanType(detectedScanType);
      setLogLines([...apiScanLog.slice(0, -1), `Detected modality: ${detectedScanType}`, apiScanLog.at(-1)]);
      setProgress(100);
      setPhase("done");
    } catch (error) {
      window.clearInterval(logTimer);
      setAnalysisError(error instanceof Error ? error.message : "Analysis failed. Please try again.");
      setLogLines((prev) => [...prev, "Analysis failed. Check that the backend is running and the image is valid."]);
      setProgress(0);
      setPhase("idle");
    }
  };

  const reset = () => {
    setFile(null); setPreview(null);
    setPhase("idle"); setLogLines([]); setProgress(0);
    setAnalysisResult(null); setAnalysisError("");
  };

  const handleLogout = async () => {
    const allowed = window.confirm("Are you sure you want to log out?");
    if (!allowed) return;

    setLogoutBusy(true);
    clearLocalSession();
    await supabase.auth.signOut();
    setLogoutBusy(false);
    navigate("/login", { replace: true });
  };

  const downloadReportPdf = () => {
    if (!analysisResult) return;

    const report = buildClinicalReport(analysisResult, scanType);
    const supplemental = buildSupplementalAnalysis(analysisResult, report, file, scanType);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 42;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 46;

    const addPageIfNeeded = (height = 60) => {
      if (y + height < pageHeight - 42) return;
      doc.addPage();
      y = 46;
    };

    const addText = (text, size = 10, style = "normal", color = [44, 62, 80]) => {
      addPageIfNeeded(size * 2.4);
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text), pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * (size + 4);
    };

    const addSection = (title) => {
      addPageIfNeeded(48);
      y += 10;
      doc.setFillColor(232, 248, 252);
      doc.rect(margin, y - 16, pageWidth - margin * 2, 28, "F");
      doc.setTextColor(18, 94, 108);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title.toUpperCase(), margin + 10, y + 2);
      y += 28;
    };

    doc.setFillColor(3, 7, 13);
    doc.rect(0, 0, pageWidth, 86, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("MedAI Diagnostic Report", margin, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateTime()} | Prepared for: ${getDisplayName(user)}`, margin, 60);
    y = 112;

    addText(report.condition, 16, "bold", [17, 24, 39]);
    addText(`ICD-10: ${report.icd} | Urgency: ${report.urgency.toUpperCase()} | Damage index: ${report.damagePercent}%`, 10);

    addSection("Analysis Summary");
    supplemental.summary.forEach((item) => addText(`${item.label}: ${item.value}`, 10));

    addSection("Detailed Findings");
    report.findings.forEach((item, index) => addText(`${index + 1}. ${item}`, 10));

    addSection("Image Quality And Processing");
    supplemental.imageQuality.forEach((item, index) => addText(`${index + 1}. ${item}`, 10));

    addSection("Clinical Context");
    supplemental.clinicalContext.forEach((item, index) => addText(`${index + 1}. ${item}`, 10));

    addSection("Precautions And Warnings");
    report.precautions.forEach((item, index) => addText(`${index + 1}. ${item}`, 10));

    addSection("Recommended Pathway");
    report.treatment.forEach((item, index) => addText(`${index + 1}. ${item.step}: ${item.detail}`, 10));
    addText(`Recommended follow-up: ${report.followUp}`, 10, "bold");

    addSection("Limitations");
    supplemental.limitations.forEach((item, index) => addText(`${index + 1}. ${item}`, 10));
    addText("Disclaimer: AI-generated output is for demonstration and triage support only. Always consult a qualified radiologist or specialist before making clinical decisions.", 9, "italic", [110, 74, 20]);

    doc.save(`medai-${normalizeScanType(scanType).toLowerCase().replace(/\s+/g, "-")}-report.pdf`);
  };

  return (
    <>
      {/* Custom cursor */}
      <div className="cursor-dot" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />

      <div className="relative min-h-screen overflow-x-hidden bg-[#03070d] text-white">

        {/* â”€â”€ Hero background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="fixed inset-0 -z-10">
          <img
            src={heroBg}
            alt=""
            className="h-full w-full object-cover opacity-30 mix-blend-luminosity"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(92,236,255,0.12),transparent_50%),linear-gradient(180deg,rgba(3,7,13,0.55)_0%,rgba(3,7,13,0.14)_40%,rgba(3,7,13,0.82)_100%)]" />
          {/* Scan grid */}
          <div className="absolute inset-0 scan-grid opacity-40" />
          {/* Vignette */}
          <div className="absolute inset-0 vignette" />
        </div>

        {/* â”€â”€ Floating icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {floatingIcons.map(({ Icon, className, depth }, i) => (
            <motion.div
              key={i}
              className={`floating-icon ${className}`}
              animate={{ y: [0, -12, 0], rotate: [0, i % 2 ? 2 : -2, 0] }}
              transition={{ duration: 7 + i * 0.55, repeat: Infinity, ease: "easeInOut" }}
              style={{ transform: `translate3d(calc(var(--pointer-x)*${depth}px),calc(var(--pointer-y)*${depth}px),0)` }}
            >
              <Icon size={28} strokeWidth={1.35} />
            </motion.div>
          ))}
        </div>

        {/* â”€â”€ Top nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <nav className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-10">
          <Link
            to="/"
            className="glass-button flex items-center gap-2 text-sm"
            style={{ minHeight: "40px", padding: "0 1rem" }}
          >
            <ArrowLeft size={15} />
            Back
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-100/[0.045] px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100/85 backdrop-blur-2xl">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5cecff] shadow-[0_0_14px_rgba(92,236,255,0.95)]" />
              AI Diagnostic Console
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfile((value) => !value)}
                className="glass-button flex items-center gap-2 text-sm"
                style={{ minHeight: "40px", padding: "0 1rem" }}
              >
                <UserCircle size={16} />
                {getDisplayName(user)}
              </button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="absolute right-0 top-12 w-[min(330px,calc(100vw-2rem))] rounded-lg border border-[rgba(127,236,255,0.24)] bg-[#06111d]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(92,236,255,0.3)] bg-[rgba(92,236,255,0.09)]">
                        <UserCircle size={24} className="text-cyan-100/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{getDisplayName(user)}</p>
                        <p className="truncate text-xs text-cyan-100/50">{user?.email || "Signed in user"}</p>
                        <p className="mt-1 text-[11px] text-slate-100/40">
                          Provider: {user?.app_metadata?.provider || "email"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-cyan-200/10 bg-white/[0.035] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-cyan-100/40">Last Analysis</p>
                        <p className="mt-1 text-sm text-white/80">{phase === "done" ? scanType : "Not ready"}</p>
                      </div>
                      <div className="rounded-lg border border-cyan-200/10 bg-white/[0.035] p-3">
                        <p className="text-[10px] uppercase tracking-widest text-cyan-100/40">Session</p>
                        <p className="mt-1 text-sm text-[rgba(100,230,140,0.9)]">Active</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {getUserProfileDetails(user).map(({ label, value }) => (
                        <div key={label} className="rounded-lg border border-cyan-200/10 bg-black/15 px-3 py-2">
                          <p className="text-[9px] uppercase tracking-widest text-cyan-100/35">{label}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-100/70">{value}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={logoutBusy}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(255,120,120,0.28)] bg-[rgba(255,80,80,0.08)] px-4 py-2 text-sm text-red-100/85 transition hover:bg-[rgba(255,80,80,0.14)] disabled:opacity-50"
                    >
                      <LogOut size={15} />
                      {logoutBusy ? "Logging out..." : "Logout"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>

        {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <main className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-4 sm:px-8 lg:px-12">

          {/* Page heading */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mb-10 text-center"
          >
            <h1 className="text-balance text-4xl font-extralight leading-tight tracking-tight text-white sm:text-6xl drop-shadow-[0_0_28px_rgba(160,243,255,0.18)]">
              Medical Image Analysis
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base font-light leading-7 text-slate-100/65">
              Upload an X-ray, MRI, CT scan or any diagnostic image and let our neural AI pipeline detect abnormalities in seconds.
            </p>
          </motion.div>

          <section id="dashboard" className="mb-8">
            <div className="glass-card p-5 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-100/55">Dashboard</p>
                  <h2 className="mt-2 text-2xl font-light text-white sm:text-3xl">Workspace overview</h2>
                </div>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
                  {dashboardTabs.map(({ title, icon: Icon }) => {
                    const isActive = activeDashboardTab === title;
                    return (
                      <button
                        key={title}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        title={title}
                        aria-label={`Open ${title} dashboard panel`}
                        onClick={() => setActiveDashboardTab(title)}
                        className={`group flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                          isActive
                            ? "border-[rgba(92,236,255,0.62)] bg-[rgba(92,236,255,0.14)] text-cyan-100 shadow-[0_0_22px_rgba(92,236,255,0.2)]"
                            : "border-cyan-100/15 bg-white/[0.035] text-cyan-100/55 hover:border-cyan-100/35 hover:text-cyan-100"
                        }`}
                      >
                        <Icon size={18} />
                        <span className="sr-only">{title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeDashboardTab === "History" ? (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-lg border border-cyan-100/12 bg-white/[0.035] p-4"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <History size={18} className="text-cyan-100/80" />
                      <div>
                        <p className="text-sm font-medium text-white/90">History</p>
                        <p className="mt-1 text-sm font-light text-slate-100/48">Recent scan activity saved in this browser</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {history.length ? history.map((item) => (
                        <div key={item.id} className="rounded-lg border border-cyan-100/10 bg-black/18 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm leading-5 text-white/85">{item.prediction}</p>
                              <p className="mt-1 break-words text-xs leading-5 text-slate-100/42">{item.fileName}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-cyan-100/18 bg-cyan-100/[0.055] px-2.5 py-1 text-[10px] text-cyan-100/70">
                              {item.scanType}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-100/38">
                            <span>{item.createdAt}</span>
                            <span>{item.confidence}% confidence</span>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-lg border border-dashed border-cyan-100/14 bg-white/[0.025] p-5 text-sm font-light leading-6 text-slate-100/45 md:col-span-2">
                          Your completed analyses will appear here after the first scan.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  dashboardCards
                    .filter(({ title }) => title === activeDashboardTab)
                    .map(({ title, icon: Icon, body, highlights, stats }) => (
                      <motion.div
                        key={title}
                        id={title.toLowerCase()}
                        role="tabpanel"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-lg border border-cyan-100/12 bg-white/[0.035] p-4"
                      >
                        <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
                          <div>
                            <div className="mb-3 flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(92,236,255,0.32)] bg-[rgba(92,236,255,0.1)] shadow-[0_0_18px_rgba(92,236,255,0.16)]">
                                <Icon size={20} className="text-cyan-100/85" />
                              </div>
                              <div>
                                <p className="text-base font-medium text-white/90">{title}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-cyan-100/38">Dashboard panel open</p>
                              </div>
                            </div>
                            <p className="max-w-3xl text-sm font-light leading-7 text-slate-100/62">{body}</p>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              {stats.map(({ label, value }) => (
                                <div key={label} className="rounded-lg border border-cyan-100/10 bg-black/18 p-3">
                                  <p className="text-[10px] uppercase tracking-widest text-cyan-100/40">{label}</p>
                                  <p className="mt-1 break-words text-sm text-white/82">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg border border-cyan-100/10 bg-black/16 p-4">
                            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.26em] text-cyan-100/45">Included Features</p>
                            <ul className="space-y-2.5">
                              {highlights.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-100/62">
                                  <CheckCircle size={13} className="mt-0.5 shrink-0 text-[rgba(100,230,140,0.85)]" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

            {/* â”€â”€ LEFT COLUMN: Upload + Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="flex flex-col gap-5"
            >
              {/* Scan type selector */}
              <div className="glass-card p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100/65">Select Scan Type</p>
                <div className="flex flex-wrap gap-2">
                  {scanTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setScanType(t)}
                      className={`rounded-md border px-4 py-2 text-sm font-light transition-all duration-200 ${
                        scanType === t
                          ? "border-[rgba(92,236,255,0.7)] bg-[rgba(92,236,255,0.12)] text-[rgba(200,252,255,0.96)] shadow-[0_0_18px_rgba(92,236,255,0.22)]"
                          : "border-[rgba(127,236,255,0.18)] bg-white/[0.035] text-slate-100/60 hover:border-[rgba(92,236,255,0.38)] hover:text-slate-100/85"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload zone */}
              <div
                ref={dropRef}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => !preview && document.getElementById("file-input").click()}
                className="glass-card relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-[rgba(92,236,255,0.32)] p-6 transition-all duration-300 hover:border-[rgba(92,236,255,0.65)] hover:shadow-[0_0_40px_rgba(92,236,255,0.14)]"
                style={{ cursor: preview ? "default" : "pointer" }}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />

                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Uploaded scan"
                      className="max-h-[260px] w-full rounded object-contain opacity-90"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); reset(); }}
                      className="absolute right-3 top-3 rounded-full border border-[rgba(255,255,255,0.18)] bg-black/40 p-1.5 text-white/60 backdrop-blur hover:text-white"
                    >
                      x
                    </button>
                  </>
                ) : (
                  <>
                    {/* Upload art background */}
                    <img
                      src={uploadArt}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-20"
                      aria-hidden="true"
                    />
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(92,236,255,0.28)] bg-[rgba(92,236,255,0.07)] shadow-[0_0_32px_rgba(92,236,255,0.18)]">
                        <Upload size={26} className="text-[rgba(185,250,255,0.8)]" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-light text-slate-100/80">Drop your scan here or <span className="text-[rgba(160,246,255,0.95)] underline underline-offset-2">browse</span></p>
                        <p className="mt-1 text-xs text-slate-100/40">PNG, JPG, DICOM - any diagnostic image</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Run scan button */}
              <button
                id="run-scan-btn"
                onClick={runScan}
                disabled={!file || phase === "scanning"}
                className="glass-button w-full justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {phase === "scanning" ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      <ScanLine size={17} />
                    </motion.span>
                    Analysing {scanType}...
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[#5cecff] shadow-[0_0_14px_rgba(92,236,255,0.95)]" />
                    Start Analysis
                  </>
                )}
              </button>

              {analysisError && (
                <div className="rounded-lg border border-[rgba(255,120,120,0.28)] bg-[rgba(255,80,80,0.07)] p-3 text-xs font-light leading-5 text-red-100/75">
                  <AlertTriangle size={13} className="mb-0.5 mr-1.5 inline text-[rgba(255,120,120,0.85)]" />
                  {analysisError}
                </div>
              )}
            </motion.div>

            {/* â”€â”€ RIGHT COLUMN: Console + Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.25 }}
              className="flex flex-col gap-5"
            >
              {/* Neural console */}
              <div className="analysis-console flex flex-col" style={{ minHeight: "200px" }}>
                <div className="console-header">
                  <span /><span /><span />
                  <span className="ml-auto text-xs font-light text-cyan-100/40 tracking-widest">NEURAL PIPELINE</span>
                </div>
                <div className="console-body flex-1 overflow-y-auto" style={{ maxHeight: "220px" }}>
                  {logLines.length === 0 && phase === "idle" && (
                    <p className="text-xs text-slate-100/30 font-light">Awaiting scan input...</p>
                  )}
                  {logLines.map((line, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`text-xs font-light leading-6 ${
                        i === logLines.length - 1 && phase === "done"
                          ? "text-[rgba(100,230,140,0.9)]"
                          : "text-cyan-100/65"
                      }`}
                    >
                      <span className="mr-2 text-[rgba(92,236,255,0.4)]">&gt;</span>{line}
                    </motion.p>
                  ))}
                  {/* Progress bar */}
                  {phase === "scanning" && (
                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#5cecff] to-[#2f7cff]"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.35 }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Results grid */}
              <AnimatePresence>
                {phase === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={15} className="text-[rgba(100,230,140,0.9)]" />
                        <p className="text-xs font-medium uppercase tracking-[0.3em] text-[rgba(100,230,140,0.85)]">
                          Analysis Complete - {scanType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={downloadReportPdf}
                        className="inline-flex items-center gap-2 rounded-lg border border-[rgba(92,236,255,0.32)] bg-[rgba(92,236,255,0.08)] px-3 py-2 text-xs font-medium text-cyan-100/90 transition hover:border-[rgba(92,236,255,0.65)] hover:bg-[rgba(92,236,255,0.13)]"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {buildResultCards(analysisResult).map(({ label, value, icon: Icon, color, glow }, i) => (
                        <motion.div
                          key={label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.35, delay: i * 0.07 }}
                          className="glass-card p-4"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-full"
                              style={{ background: `rgba(0,0,0,0.3)`, boxShadow: `0 0 14px ${glow}` }}
                            >
                              <Icon size={13} style={{ color }} />
                            </div>
                            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-100/55">{label}</p>
                          </div>
                          <p className="text-2xl font-extralight" style={{ color, textShadow: `0 0 18px ${glow}` }}>
                            {value}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {(() => {
                      const report = buildClinicalReport(analysisResult, scanType);
                      const supplemental = buildSupplementalAnalysis(analysisResult, report, file, scanType);
                      return (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="glass-card p-4">
                            <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-100/55">
                              <FileText size={12} /> Analysed Data
                            </p>
                            <div className="space-y-2">
                              {supplemental.summary.map((item) => (
                                <div key={item.label} className="border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-100/40">{item.label}</p>
                                  <p className="mt-1 break-words text-sm font-light leading-6 text-slate-100/78">{item.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="glass-card p-4">
                            <p className="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-100/55">
                              <ClipboardList size={12} /> Processing Notes
                            </p>
                            <ul className="space-y-2">
                              {supplemental.imageQuality.slice(0, 3).map((item) => (
                                <li key={item} className="flex items-start gap-2 break-words text-sm font-light leading-6 text-slate-100/58">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(92,236,255,0.7)]" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Disclaimer */}
                    <div className="mt-4 rounded-lg border border-[rgba(255,180,80,0.22)] bg-[rgba(255,160,40,0.06)] p-3 text-xs font-light leading-5 text-slate-100/55">
                      <AlertTriangle size={12} className="mb-0.5 mr-1.5 inline text-[rgba(255,180,80,0.7)]" />
                      Results are AI-generated for demonstration purposes only. Always consult a qualified radiologist for clinical decisions.
                    </div>

                    {/* â”€â”€ Full Diagnostic Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {(() => {
                      const report = buildClinicalReport(analysisResult, scanType);
                      const supplemental = buildSupplementalAnalysis(analysisResult, report, file, scanType);
                      const urgencyConfig = {
                        high:   { label: "High Urgency",   color: "rgba(255,100,100,0.9)",  glow: "rgba(255,80,80,0.3)",   bg: "rgba(255,80,80,0.08)"   },
                        medium: { label: "Medium Urgency", color: "rgba(255,180,80,0.9)",   glow: "rgba(255,160,40,0.3)",  bg: "rgba(255,140,40,0.08)"  },
                        low:    { label: "Low Urgency",    color: "rgba(100,230,140,0.9)",  glow: "rgba(80,210,120,0.3)",  bg: "rgba(80,210,120,0.06)"  },
                      }[report.urgency];
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 28 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="mt-6 space-y-5"
                        >
                          {/* â”€â”€ Header â”€â”€ */}
                          <div className="glass-card p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-100/50">Diagnostic Report - ICD-10 {report.icd}</p>
                                <h3 className="mt-1 text-xl font-light text-white">{report.condition}</h3>
                              </div>
                              <span className="rounded-full border px-3 py-1 text-xs font-medium"
                                style={{ borderColor: urgencyConfig.color, color: urgencyConfig.color, background: urgencyConfig.bg, boxShadow: `0 0 16px ${urgencyConfig.glow}` }}>
                                {urgencyConfig.label}
                              </span>
                            </div>

                            {/* Damage gauge */}
                            <div className="mt-5">
                              <div className="mb-2 flex items-center justify-between text-xs">
                                <span className="font-medium uppercase tracking-widest text-slate-100/55">Tissue / Region Damage Index</span>
                                <span className="text-lg font-extralight" style={{ color: urgencyConfig.color, textShadow: `0 0 14px ${urgencyConfig.glow}` }}>
                                  {report.damagePercent}%
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${report.damagePercent}%` }}
                                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                                  className="h-full rounded-full"
                                  style={{ background: `linear-gradient(90deg, rgba(92,236,255,0.8), ${urgencyConfig.color})` }}
                                />
                              </div>
                              <div className="mt-1 flex justify-between text-[10px] text-slate-100/30">
                                <span>Minimal (0%)</span><span>Critical (100%)</span>
                              </div>
                            </div>
                          </div>

                          {/* â”€â”€ Disease Stages (MRI / CT / PET only) â”€â”€ */}
                          {report.hasStages && (
                            <div className="glass-card p-5">
                              <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100/55">
                                <TrendingUp size={12} /> Disease Progression Stages
                              </p>
                              <div className="relative">
                                {/* Connecting line */}
                                <div className="absolute left-[18px] top-0 h-full w-px bg-gradient-to-b from-[rgba(92,236,255,0.3)] to-transparent" />
                                <div className="space-y-4">
                                  {report.stages.map((s, i) => {
                                    const isActive  = i === report.stageIndex;
                                    const isPast    = i < report.stageIndex;
                                    const isFuture  = i > report.stageIndex;
                                    return (
                                      <motion.div
                                        key={s.label}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.4, delay: 0.1 * i }}
                                        className={`relative flex items-start gap-4 rounded-lg p-3 transition-all ${
                                          isActive ? "border border-[rgba(255,180,80,0.35)] bg-[rgba(255,140,40,0.07)]" :
                                          isPast   ? "opacity-55" : "opacity-30"
                                        }`}
                                      >
                                        {/* Stage dot */}
                                        <div
                                          className="relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-medium"
                                          style={isActive ? { borderColor: s.color, color: s.color, background: "rgba(0,0,0,0.4)", boxShadow: `0 0 18px ${s.color.replace("0.9","0.4")}` } : { borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}
                                        >
                                          {i + 1}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-light" style={{ color: isActive ? s.color : "rgba(255,255,255,0.6)" }}>{s.label}</p>
                                            {isActive && <span className="rounded-full bg-[rgba(255,180,80,0.18)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest text-[rgba(255,180,80,0.9)]">Current</span>}
                                          </div>
                                          <p className="mt-0.5 text-xs font-light text-slate-100/45">{s.desc}</p>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* â”€â”€ Detailed Findings â”€â”€ */}
                          <div className="glass-card p-5">
                            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100/55">
                              <ListChecks size={12} /> Detailed Findings
                            </p>
                            <ul className="space-y-2.5">
                              {report.findings.map((f, i) => (
                                <motion.li
                                  key={i}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.35, delay: 0.06 * i }}
                                  className="flex items-start gap-3 text-sm font-light leading-6 text-slate-100/70"
                                >
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(92,236,255,0.7)] shadow-[0_0_8px_rgba(92,236,255,0.6)]" />
                                  {f}
                                </motion.li>
                              ))}
                            </ul>
                          </div>

                          <div className="glass-card p-5">
                            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100/55">
                              <ClipboardList size={12} /> Clinical Context & Limitations
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-100/45">Context</p>
                                <ul className="space-y-2">
                                  {supplemental.clinicalContext.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-100/60">
                                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(92,236,255,0.7)]" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-100/45">Limitations</p>
                                <ul className="space-y-2">
                                  {supplemental.limitations.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-100/60">
                                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(255,180,80,0.8)]" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          {/* â”€â”€ Precautions â”€â”€ */}
                          <div className="glass-card p-5">
                            <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-[rgba(255,180,80,0.8)]">
                              <TriangleAlert size={12} /> Precautions & Warnings
                            </p>
                            <ul className="space-y-2.5">
                              {report.precautions.map((p, i) => (
                                <motion.li
                                  key={i}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.35, delay: 0.06 * i }}
                                  className="flex items-start gap-3 rounded-lg border border-[rgba(255,180,80,0.14)] bg-[rgba(255,140,40,0.05)] p-2.5 text-sm font-light leading-6 text-slate-100/70"
                                >
                                  <AlertTriangle size={13} className="mt-1 shrink-0 text-[rgba(255,180,80,0.7)]" />
                                  {p}
                                </motion.li>
                              ))}
                            </ul>
                          </div>

                          {/* â”€â”€ Treatment Pathway â”€â”€ */}
                          <div className="glass-card p-5">
                            <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-[rgba(100,230,140,0.8)]">
                              <Stethoscope size={12} /> Recommended Treatment Pathway
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {report.treatment.map(({ step, detail, icon: Icon }, i) => (
                                <motion.div
                                  key={step}
                                  initial={{ opacity: 0, scale: 0.93 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.35, delay: 0.08 * i }}
                                  className="flex items-start gap-3 rounded-lg border border-[rgba(100,230,140,0.18)] bg-[rgba(80,210,120,0.05)] p-3"
                                >
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(100,230,140,0.3)] bg-[rgba(80,210,120,0.1)] shadow-[0_0_14px_rgba(80,210,120,0.2)]">
                                    <Icon size={13} className="text-[rgba(100,230,140,0.9)]" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-[rgba(160,250,190,0.9)]">{step}</p>
                                    <p className="mt-0.5 text-[11px] font-light text-slate-100/50">{detail}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* â”€â”€ Follow-up â”€â”€ */}
                          <div className="flex items-center gap-4 rounded-lg border border-[rgba(92,236,255,0.22)] bg-[rgba(92,236,255,0.05)] p-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(92,236,255,0.35)] bg-[rgba(92,236,255,0.1)] shadow-[0_0_18px_rgba(92,236,255,0.2)]">
                              <CalendarClock size={16} className="text-[rgba(185,250,255,0.85)]" />
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase tracking-widest text-cyan-100/60">Recommended Follow-Up</p>
                              <p className="mt-0.5 text-sm font-light text-white/85">Next review in <span className="font-medium text-[rgba(185,250,255,0.95)]">{report.followUp}</span> - adhere strictly to specialist advice</p>
                            </div>
                          </div>

                        </motion.div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Idle state â€” show scan type preview image */}
              {phase === "idle" && !file && (
                <motion.div
                  key={scanType}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45 }}
                  className="relative overflow-hidden rounded-lg border border-[rgba(127,236,255,0.18)]"
                  style={{ minHeight: "220px" }}
                >
                  <img
                    src={scanPreviews[scanType]}
                    alt={`${scanType} preview`}
                    className="h-full w-full object-cover opacity-70"
                    style={{ minHeight: "220px" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#03070d] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <span className="rounded-full border border-[rgba(92,236,255,0.4)] bg-[rgba(92,236,255,0.1)] px-3 py-1 text-[10px] uppercase tracking-widest text-cyan-100/80">
                      {scanType} - Sample Preview
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* â”€â”€ Sample Scans Gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <motion.section
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-8"
          >
            <div className="mb-4 flex items-center gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-100/55">MRI, CT and X-ray Guide</p>
                <p className="mt-1 text-sm font-light text-slate-100/45">Broader explanations for choosing and understanding each imaging type</p>
              </div>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(92,236,255,0.22)] to-transparent" />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {modalityGuides.map(({ title, icon: Icon, image, summary, strengths, limitations }) => (
                <article key={title} className="glass-card overflow-hidden rounded-lg">
                  <div className="relative h-44 overflow-hidden">
                    <img src={image} alt={`${title} medical scan`} className="h-full w-full object-cover opacity-75" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#03070d] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-cyan-100/24 bg-black/35 px-3 py-1.5 backdrop-blur">
                      <Icon size={14} className="text-cyan-100/85" />
                      <span className="text-xs font-medium text-cyan-100/85">{title}</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-light leading-7 text-slate-100/68">{summary}</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <div>
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[rgba(100,230,140,0.8)]">Best For</p>
                        <ul className="space-y-2">
                          {strengths.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-100/58">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(100,230,140,0.85)]" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[rgba(255,180,80,0.8)]">Remember</p>
                        <ul className="space-y-2">
                          {limitations.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-100/58">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgba(255,180,80,0.85)]" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8"
          >
            <div className="mb-4 flex items-center gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-100/55">Sample Diagnostic Scans</p>
                <p className="mt-1 text-sm font-light text-slate-100/45">Click any card to load it into the analyser</p>
              </div>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(92,236,255,0.22)] to-transparent" />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {sampleScans.map(({ label, tag, img, finding }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.025, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => loadSampleScan({ label, tag, img })}
                  className="glass-card group relative overflow-hidden rounded-lg text-left transition-all duration-300 hover:border-[rgba(92,236,255,0.5)] hover:shadow-[0_0_36px_rgba(92,236,255,0.16)]"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={img}
                      alt={label}
                      className="h-full w-full object-cover opacity-75 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#03070d] via-[rgba(3,7,13,0.25)] to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full border border-[rgba(92,236,255,0.38)] bg-[rgba(92,236,255,0.1)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-cyan-100/80 backdrop-blur">
                      {tag}
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="rounded-full border border-[rgba(92,236,255,0.6)] bg-[rgba(92,236,255,0.14)] px-4 py-2 text-xs font-medium text-cyan-100/95 backdrop-blur-sm shadow-[0_0_24px_rgba(92,236,255,0.3)]">
                        Load into Analyser
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-light text-white/90">{label}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-100/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,180,80,0.85)] shadow-[0_0_8px_rgba(255,160,40,0.6)]" />
                      {finding}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <footer className="mt-10 rounded-lg border border-cyan-100/12 bg-white/[0.025] p-5 text-center">
            <p className="text-sm font-light leading-6 text-slate-100/55">
              Feedback footer: report confusing predictions, upload failures, or missing clinical details through the Feedback card above. This platform is for educational triage support and does not replace a licensed radiologist.
            </p>
            <p className="mt-2 text-xs text-cyan-100/35">MedAI Diagnostics Dashboard | Help | Settings | About | Feedback | History</p>
          </footer>

        </main>
      </div>
    </>
  );
}

