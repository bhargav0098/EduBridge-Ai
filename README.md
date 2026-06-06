# 🎓 EduBridge AI
> **Next-generation AI-powered learning ecosystem designed to bridge academic divides.**  
> *Adaptive • Personalized • Highly Inclusive*

---

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Framer_Motion-black?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
</p>

---

## 🏛️ System Architecture

Below is the conceptual architecture showing how the interactive frontend modules, state controllers, local data sources, and the Next-Themes engine interlock to deliver a unified, cinematic, and responsive platform.

```mermaid
graph TD
    %% Styling
    classDef client fill:#312E81,stroke:#6366F1,stroke-width:2px,color:#fff;
    classDef logic fill:#1E1B4B,stroke:#8B5CF6,stroke-width:2px,color:#fff;
    classDef services fill:#0D0B1E,stroke:#06B6D4,stroke-width:2px,color:#fff;
    classDef storage fill:#080814,stroke:#10B981,stroke-width:2px,color:#fff;

    %% Nodes
    subgraph UI_Layer ["Client & UI Layer (Framer Motion + Tailwind CSS)"]
        A["Cinematic Bootup Screen (Terminal + Streams)"]:::client
        B["Theme Controller (next-themes: Light/Dark)"]:::client
        C["Main Landing Page & Nav Roster"]:::client
    end

    subgraph Logic_Layer ["Application & Logic Engines"]
        D["💬 AI Tutor Interface"]:::logic
        E["📈 Adaptive Quiz Engine"]:::logic
        F["👥 Peer Matching Module"]:::logic
        G["🏫 Campus Resource Booking"]:::logic
    end

    subgraph Service_Layer ["Services & Middleware"]
        H["Attendance Services"]:::services
        I["Local API Adapters & Mock State"]:::services
    end

    subgraph Data_Layer ["Data & Specifications"]
        J["UX Wireframes Dashboard (HTML Mockups)"]:::storage
        K["Local Design Tokens (Sora + Inter + Variable CSS)"]:::storage
    end

    %% Flows & Connections
    A -->|"Auto-transition (2.8s Fade)"| C
    B -->|"Applies Class / Var Tokens"| K
    K -->|"Drives Colors & Layout"| C
    C -->|"Directs to"| Logic_Layer
    
    D & E & F & G <--> I
    I <--> H
    J <-->|"Drives Layout Specifications"| UI_Layer
```

---

## ✨ Outstanding Features & Capabilities

| Module | Purpose | Cinematic Element | Key UX Screen |
| :--- | :--- | :--- | :--- |
| **💬 AI Tutor** | Direct tutoring and multi-lingual translation | Markdown stream transitions | Interactive 3-panel chat view |
| **📈 Adaptive Quiz** | Evaluates student knowledge gaps | Spring-physics animated card flips | Responsive results scorecard |
| **👥 Peer Matching** | Links students with complementary skills | Concentric pulse ring indicators | Group discussion portal |
| **🏫 Campus Tools** | Organizes schedules and bookings | Micro-animated timeline blocks | Lab resource scheduler |

---

## 🎭 Visual Excellence & Polish

*   **Cinematic Intro Sequence:** Includes vertical matrix data stream columns, circular ripple pulses, a shimmer loading progress indicator, and a cyber-themed status terminal that automatically guides the user to `/home` with custom expo transitions.
*   **Aesthetic Theme Engine:** Incorporates custom Variable-based Design CSS tokens. Includes an advanced Light/Dark toggler, resolving all text contrast limits and card container gradients for judges.

---

## 📂 Interactive UX Wireframes Library

A complete pixel-perfect mockup library is located in the `/wireframes` directory.

### Visualizing Dashboard & Screens
Open `wireframes/index.html` in any web browser to view:
1.  **Component Library:** Button styles, field validations, modals.
2.  **Auth Portals:** Adaptive forms for Register & Login.
3.  **Student Hub:** Streak counter, course analytics, widgets.
4.  **Notes Editor:** WYSIWYG editor with flashcards and summary sidebars.
5.  **Teacher/Admin Panel:** CPU gauges, class performance charts.

---

## ⚙️ Development & Quickstart

### Setup Instructions
1.  **Install project packages:**
    ```bash
    npm install
    ```
2.  **Launch local dev environment:**
    ```bash
    npm run dev
    ```
3.  **Open in browser:**
    Visit [http://localhost:3000](http://localhost:3000).

4.  **Produce build binary:**
    ```bash
    npm run build
    ```
