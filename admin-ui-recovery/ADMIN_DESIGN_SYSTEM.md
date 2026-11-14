# SmartBus Admin Panel — Design System & UI Specification

**Project**: SmartBus — College Bus Tracker & Campus Transit Safety Console  
**Generated On**: November 13, 2026  
**Auditor**: Antigravity AI  
**Source Code Baseline**: `D:\bus traking ai\admin\app\globals.css` (703 lines), `layout.tsx`, and component library.

---

## 1. Design System Overview & Archetype

The SmartBus Admin Panel utilizes a **Mission-Critical Cyber-Transit Dark Theme** engineered for high-density dispatch operations, real-time telemetry observation, and high-urgency safety response.

### Core Visual Archetypes:
- **Deep Obsidian Surface**: Background layers range from ultra-deep navy-black (`#070a13`) to structured midnight navy (`#111a2e`), ensuring maximum contrast for live maps and status indicators while reducing eye fatigue during prolonged monitoring shifts.
- **Electric Cyan & Sky Accents**: Cyan (`#38bdf8`) conveys live telemetry, automated connectivity, and real-time streaming state.
- **Urgent Emergency Red**: High-visibility alert red (`#ef4444`) with animated glowing pulse effects (`@keyframes sosPulse` and `shadow-glow-red`) immediately commands administrator focus during student/driver SOS events.
- **Glassmorphic Floating Overlays**: Sticky headers, map layers, and search modals utilize backdrop blurs (`backdrop-filter: blur(12px - 14px)`) over translucent midnight surfaces.
- **Information Density with Strict Hierarchy**: Data tables, KPI widgets, and stop sequence timelines use compact typographic badges and tabular numerals (`font-variant: tabular-nums`) for scan-friendly auditing.

---

## 2. Color Palette & Token Catalog

### 2.1 Background & Surface Tokens

| Token Name | Hex / RGBA Value | Semantic Usage & Component Target |
|---|---|---|
| `--bg-primary` | `#070a13` | Root body canvas, topbar base, table header backdrop |
| `--bg-secondary` | `#0d1322` | Fixed left sidebar, card secondary panels, form input background |
| `--bg-card` | `#111a2e` | Primary content cards, modals, KPI metric cards, popovers |
| `--bg-hover` | `#17223b` | Interactive hover state for table rows, sidebar items, secondary buttons |
| `--bg-elevated` | `#1a2744` | High-elevation containers, modal headers, dropdown selection active states |

### 2.2 Border Tokens

| Token Name | Hex / RGBA Value | Semantic Usage & Component Target |
|---|---|---|
| `--border` | `#1a2744` | Structural dividers, table row borders, card outlines |
| `--border-light` | `#243459` | Interactive element borders, form input borders, unselected tab dividers |
| `--border-focus` | `#38bdf8` | Focused form fields, active button outlines, hovered stop sequence buttons |

### 2.3 Typography & Foreground Tokens

| Token Name | Hex / RGBA Value | Semantic Usage & Component Target |
|---|---|---|
| `--text-primary` | `#f8fafc` | Primary titles, KPI values, table cell text, modal headers (Slate-50) |
| `--text-secondary` | `#94a3b8` | Subtitles, descriptions, input labels, inactive navigation links (Slate-400) |
| `--text-muted` | `#64748b` | Table column headers, timestamps, placeholder text, breadcrumbs (Slate-500) |
| `--text-dim` | `#475569` | Ghost iconography, inactive stop sequence numbers, subtle borders (Slate-600) |

### 2.4 Semantic Brand & Status Accents

| Token Name | Hex / RGBA Value | Semantic Purpose | Associated Badges & Highlights |
|---|---|---|---|
| `--accent` | `#38bdf8` (Sky-400) | Primary interactive actions, active navigation pill, live bus pins | `.badge-blue`, `.stat-icon.blue` |
| `--accent-dark` | `#0284c7` (Sky-600) | Primary button hover state, pressed states | Hover state for `.btn-primary` |
| `--accent-light` | `#7dd3fc` (Sky-300) | Secondary links, highlighted geocode labels | High-contrast text highlights |
| `--accent-glow` | `rgba(56, 189, 248, 0.16)` | Background for active menu items, blue stat icons, focus halos | `box-shadow: 0 0 0 3px var(--accent-glow)` |
| `--danger` | `#ef4444` (Red-500) | Critical SOS alerts, delete actions, missed stops, wrong bus mismatches | `.badge-red`, `.stat-icon.red` |
| `--danger-bg` | `rgba(239, 68, 68, 0.16)` | Emergency banner background, active SOS navigation item, alert cards | Emergency dispatch cards |
| `--danger-border`| `rgba(239, 68, 68, 0.35)` | Outline for emergency confirm dialogs, SOS badge borders | Confirmed deletion outlines |
| `--success` | `#10b981` (Emerald-500)| Completed trips, boarded students, approved registrations, active routes | `.badge-green`, `.stat-icon.green` |
| `--success-bg` | `rgba(16, 185, 129, 0.14)`| Background for success badges and stat icon wrappers | Verified boarding rows |
| `--success-border`| `rgba(16, 185, 129, 0.30)`| Border for verified badges | Boarded student status indicators |
| `--warning` | `#f59e0b` (Amber-500) | Pending registrations, in-transit status, acknowledged SOS alerts | `.badge-yellow`, `.stat-icon.yellow` |
| `--warning-bg` | `rgba(245, 158, 11, 0.14)`| Background for pending/warning badges | Acknowledged triage cards |
| `--warning-border`| `rgba(245, 158, 11, 0.30)`| Border for warning badges | Standby operational indicators |
| `--purple` | `#8b5cf6` (Purple-500) | Evening return schedules, special routes, student counts | `.badge-purple`, `.stat-icon.purple` |
| `--purple-bg` | `rgba(139, 92, 246, 0.14)`| Background for evening return badges | Evening schedule chip |
| `--cyan` | `#06b6d4` (Cyan-500) | Driver counts, telemetry telemetry metrics, speed readings | `.stat-icon.cyan` |
| `--cyan-bg` | `rgba(6, 182, 212, 0.14)` | Background for driver metric icons | Driver KPI card |

---

## 3. Typography Hierarchy & Font Specifications

- **Primary Font Family**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Fallback Stack**: System UI sans-serif
- **Kerning & Anti-aliasing**: `-webkit-font-smoothing: antialiased; letter-spacing: -0.01em to -0.02em` on titles.

### Typographic Scale Matrix

| Level / Class | Font Size | Font Weight | Line Height | Letter Spacing | Text Transform | Example Usage |
|---|---|---|---|---|---|---|
| **KPI Metric Value** | `28px` | `900` (Black) | `1.0` | `-0.02em` | None (`tabular-nums`) | Stat card primary number (`12`, `1,248`) |
| **Page Title** (`.page-title`) | `24px` | `900` (Black) | `1.2` | `-0.02em` | None | Header title ("Fleet Live Tracking") |
| **Brand Wordmark** (`.sidebar-logo h1`)| `20px` | `900` (Black) | `1.2` | `-0.02em` | None | "Smart**Bus**" |
| **Top Bar Title** (`.topbar-title`) | `18px` | `800` (ExtraBold) | `1.2` | `-0.01em` | None | Sticky header page title |
| **Modal Title** (`.modal-title`) | `17px` | `800` (ExtraBold) | `1.3` | `-0.01em` | None | "Add New Corridor Route" |
| **Card Heading** (`.card-title`) | `15px` | `800` (ExtraBold) | `1.3` | `-0.01em` | None | "Active Corridors & Fleet Assignment" |
| **Body Primary** (`td`, `input`, `.btn`)| `13.5px` | `500` / `600` | `1.5` | `0` | None | Table values, form inputs, button labels |
| **Sidebar Link** (`.nav-item`) | `13.5px` | `600` (SemiBold)| `1.4` | `0` | None | "Route Monitoring", "SOS Incidents" |
| **Page Subtitle** (`.page-subtitle`)| `13px` | `400` (Regular) | `1.4` | `0` | None | "Real-time GPS tracking and alerts" |
| **Button Small** (`.btn-sm`) | `12px` | `700` (Bold) | `1.2` | `0` | None | Action triggers, row buttons |
| **Form Label** (`.form-label`) | `11.5px` | `700` (Bold) | `1.3` | `0.04em` | UPPERCASE | "BUS REGISTRATION NUMBER" |
| **Filter Chip** (`.chip`) | `11.5px` | `700` (Bold) | `1.2` | `0` | None | "Boarded", "Wrong Bus" |
| **Meta / Timestamps** (`.stat-change`)| `11px` | `500` (Medium) | `1.3` | `0` | None | "Updated 2 seconds ago", "4 Stops" |
| **Badge / Tag** (`.badge`) | `10.5px` | `800` (ExtraBold) | `1.0` | `0.05em` | UPPERCASE | "LIVE", "ONLINE", "ACTIVE", "EXPIRED" |
| **Table Column Header** (`th`) | `10.5px` | `800` (ExtraBold) | `1.0` | `0.08em` | UPPERCASE | "STUDENT NAME", "PICKUP STOP", "ACTIONS"|
| **Sidebar Section Tag** (`.nav-section`)| `10px` | `800` (ExtraBold) | `1.0` | `0.10em` | UPPERCASE | "DISPATCH & OPERATIONS", "MANAGEMENT" |

---

## 4. Spacing Scale, Layout Dimensions & Elevation

### 4.1 Structural Dimensions

- **Sidebar Fixed Width**: `270px` (`--sidebar-w`)
- **Top Navigation Height**: `64px` (Sticky, `z-index: 50`, `backdrop-filter: blur(14px)`)
- **Main Container Max Width**: `1540px` (`margin: 0 auto`, `padding: 32px`)
- **Responsive Breakpoint**: `900px` (Sidebar hides via `transform: translateX(-100%)`, mobile sheet active)
- **Modal Max Widths**: Default: `580px`; Large (`.modal-lg`): `780px`; Confirm (`.confirm-dialog`): `400px`

### 4.2 Border Radii Scale

- **Small Radius** (`--radius-sm`): `8px` — Buttons, form inputs, stop item rows, tab pills.
- **Medium / Default Radius** (`--radius`): `14px` — Cards, stat widgets, modal windows, map frame.
- **Large Radius** (`--radius-lg`): `20px` — Badges, filter chips, drawer headers.
- **Round / Circle**: `50%` — Stop sequence numbers (`26px x 26px`), status indicator dots (`8px x 8px`).

### 4.3 Shadow & Glow System

```css
--shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
--shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.60);
--shadow-glow-red: 0 0 20px rgba(239, 68, 68, 0.30);
--shadow-glow-blue: 0 0 20px rgba(56, 189, 248, 0.25);
```

---

## 5. Component Variants & UI Specifications

### 5.1 Button Variants (`.btn`)

Base styles: `display: inline-flex; align-items: center; gap: 8px; font-weight: 700; transition: all 0.15s; white-space: nowrap;`

| Variant Class | Background | Text Color | Border | Hover State | Glow Effect |
|---|---|---|---|---|---|
| `.btn-primary` | `#38bdf8` (`--accent`) | `#ffffff` | None | `#0284c7` | `0 0 20px rgba(56, 189, 248, 0.25)` |
| `.btn-secondary` | `#17223b` (`--bg-hover`) | `#f8fafc` | `1px solid #243459` | `#243459` | None |
| `.btn-danger` | `#ef4444` (`--danger`) | `#ffffff` | None | `#dc2626` | `0 0 20px rgba(239, 68, 68, 0.30)` |
| `.btn-success` | `#10b981` (`--success`)| `#ffffff` | None | `#059669` | None |
| `.btn-ghost` | `transparent` | `#94a3b8` | None | `#17223b` (text: `#f8fafc`) | None |
| `.btn-sm` modifier | Inherits variant | Inherits | Inherits | Inherits | `padding: 6px 12px; font-size: 12px; border-radius: 6px;` |
| `.btn-icon` modifier| Inherits variant | Inherits | Inherits | Inherits | `width: 34px; height: 34px; padding: 0; justify-content: center;` |

### 5.2 Badge System (`.badge`)

Base styles: `display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;`

| Badge Class | Background | Text Color | Border | Dot Color | Operational Meaning |
|---|---|---|---|---|---|
| `.badge-blue` | `rgba(56, 189, 248, 0.16)` | `#38bdf8` | `rgba(56, 189, 248, 0.30)` | `#38bdf8` | In Transit, Live Streaming, Morning Pickup |
| `.badge-green`| `rgba(16, 185, 129, 0.14)` | `#10b981` | `rgba(16, 185, 129, 0.30)` | `#10b981` | Active, Boarded, Approved, Resolved |
| `.badge-yellow`| `rgba(245, 158, 11, 0.14)`| `#f59e0b` | `rgba(245, 158, 11, 0.30)` | `#f59e0b` | Pending Approval, Acknowledged, Scheduled |
| `.badge-red` | `rgba(239, 68, 68, 0.16)` | `#ef4444` | `rgba(239, 68, 68, 0.35)` | `#ef4444` | SOS Triggered, Wrong Bus, Inactive, Expired |
| `.badge-purple`| `rgba(139, 92, 246, 0.14)`| `#8b5cf6` | `rgba(139, 92, 246, 0.30)` | `#8b5cf6` | Evening Return Schedule, Shift B |
| `.badge-gray` | `rgba(100, 116, 139, 0.15)`| `#64748b`| `rgba(100, 116, 139, 0.20)`| `#64748b` | Offline, Idle, Standby |

### 5.3 Filter Chips (`.chip`)

Used in table toolbars and schedule switchers:
- **Default**: Background `#0d1322`, border `1px solid #243459`, color `#94a3b8`, padding `4px 12px`, radius `20px`.
- **Hover**: Background `#17223b`, color `#f8fafc`.
- **Active (`.active-chip`)**: Background `rgba(56, 189, 248, 0.16)`, color `#38bdf8`, border `1px solid rgba(56, 189, 248, 0.35)`.

### 5.4 Form Elements (`.form-input`, `.form-select`, `.form-textarea`)

- **Container**: Background `#0d1322`, border `1px solid #243459`, radius `8px`, padding `10px 14px`, text `#f8fafc`.
- **Focus State**: Border color `#38bdf8`, `box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16)`.
- **Placeholder**: Text color `#64748b`.
- **Validation Error (`.field-error`)**: Text color `#ef4444`, font size `11px`, flex row with AlertCircle icon.

### 5.5 Card & Stat Widgets

- **Container Card (`.card`)**: Background `#111a2e`, border `1px solid #1a2744`, radius `14px`.
- **Header (`.card-header`)**: Padding `18px 22px 14px`, border bottom `1px solid #1a2744`, flex align center justify space-between.
- **KPI Stat Card (`.stat-card`)**: Background `#111a2e`, border `1px solid #1a2744`, radius `14px`, padding `18px`, flex align flex-start justify space-between. Hover: `transform: translateY(-2px); box-shadow: var(--shadow)`.
- **Icon Box (`.stat-icon`)**: `42px x 42px`, radius `12px`, flex center. Variations: `.blue`, `.green`, `.yellow`, `.red`, `.purple`, `.cyan`.

### 5.6 Data Tables (`.table-wrap`)

- **Table Header (`th`)**: Sticky top, background `#0d1322`, padding `11px 16px`, font size `10.5px`, weight `800`, text `#64748b`, uppercase, letter-spacing `0.08em`, border bottom `1px solid #1a2744`.
- **Table Cell (`td`)**: Padding `13px 16px`, font size `13.5px`, text `#f8fafc`, border bottom `1px solid #1a2744`, vertical-align `middle`.
- **Hover Row (`tr:hover td`)**: Background `#17223b`.
- **Empty State (`.table-empty`)**: Padding `48px 16px`, centered text `#64748b`.

---

## 6. Keyframe Animations & Micro-Interactions

### 6.1 `pulseGlow` (Live Operational Heartbeat)
Applied to live indicator dots and moving bus icons:
```css
@keyframes pulseGlow {
  0% { transform: scale(0.95); opacity: 0.7; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.7; }
}
```

### 6.2 `sosPulse` (Critical Emergency Radar Animation)
Applied to active SOS markers on the emergency triage map:
```css
@keyframes sosPulse {
  0% { transform: scale(0.6); opacity: 1; }
  100% { transform: scale(2.6); opacity: 0; }
}
```

### 6.3 `shimmer` (Skeleton Loading States)
Applied to table rows and KPI cards during API data fetches:
```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 6.4 `fadeIn` & `slideUp` (Modals and Drawers)
Applied to modal backdrops and dialog windows:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 7. Map & Spatial Styling System

### 7.1 Custom HTML DivIcons

| Marker Type | Dimensions | Visual Structure | Animation |
|---|---|---|---|
| **Live Bus (Active)** | `38px x 38px` | Blue gradient circle, bus SVG icon, directional arrow pointing along heading, badge with Bus Number | `pulseGlow 2s infinite` |
| **Stop Pin (Pickup)** | `28px x 28px` | Amber border circle with sequence number inside (`1`, `2`, `3…`), white center dot | Static / Hover grow |
| **Stop Pin (Return)** | `28px x 28px` | Purple border circle with sequence number inside, white center dot | Static / Hover grow |
| **SOS Victim Radar** | `44px x 44px` | Solid red core with white AlertTriangle icon surrounded by 2 expanding concentric rings | `sosPulse 1.5s infinite` |
| **Campus Hub Anchor** | `32px x 32px` | White building icon on navy circle with gold border | Static |

### 7.2 Proximity & Corridor Geometry
- **Stop Proximity Radius**: Circle overlay with radius `80m`, fill `rgba(56, 189, 248, 0.12)`, stroke `#38bdf8` (`1.5px dashed`).
- **Route Corridor Polyline**: Stroke `#38bdf8`, weight `4px`, opacity `0.85`, lineJoin `round`.

---

## 8. Figma & Stitch Token Mapping Table

For direct import into Figma Tokens or Stitch Design System generator:

```json
{
  "color": {
    "background": {
      "primary": { "value": "#070a13" },
      "secondary": { "value": "#0d1322" },
      "card": { "value": "#111a2e" },
      "hover": { "value": "#17223b" },
      "elevated": { "value": "#1a2744" }
    },
    "border": {
      "default": { "value": "#1a2744" },
      "light": { "value": "#243459" },
      "focus": { "value": "#38bdf8" }
    },
    "text": {
      "primary": { "value": "#f8fafc" },
      "secondary": { "value": "#94a3b8" },
      "muted": { "value": "#64748b" },
      "dim": { "value": "#475569" }
    },
    "brand": {
      "accent": { "value": "#38bdf8" },
      "accentDark": { "value": "#0284c7" },
      "accentLight": { "value": "#7dd3fc" },
      "accentGlow": { "value": "rgba(56, 189, 248, 0.16)" }
    },
    "status": {
      "danger": { "value": "#ef4444" },
      "dangerBg": { "value": "rgba(239, 68, 68, 0.16)" },
      "success": { "value": "#10b981" },
      "successBg": { "value": "rgba(16, 185, 129, 0.14)" },
      "warning": { "value": "#f59e0b" },
      "warningBg": { "value": "rgba(245, 158, 11, 0.14)" },
      "purple": { "value": "#8b5cf6" },
      "purpleBg": { "value": "rgba(139, 92, 246, 0.14)" }
    }
  },
  "typography": {
    "fontFamily": { "value": "Inter, sans-serif" },
    "fontSize": {
      "kpi": { "value": "28px" },
      "title": { "value": "24px" },
      "modalTitle": { "value": "17px" },
      "cardTitle": { "value": "15px" },
      "body": { "value": "13.5px" },
      "button": { "value": "13px" },
      "label": { "value": "11.5px" },
      "caption": { "value": "10.5px" },
      "sectionTag": { "value": "10px" }
    }
  },
  "radius": {
    "sm": { "value": "8px" },
    "md": { "value": "14px" },
    "lg": { "value": "20px" },
    "pill": { "value": "9999px" }
  }
}
```
