"use client"

import Link from "next/link"
import { useEffect } from "react"
import { APP_CONFIG } from "@/config/app.config"

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("lp-visible")
        })
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    )
    document.querySelectorAll(".lp-fade-up").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        /* ─── BASE ─────────────────────────────────────────── */
        .lp-root {
          font-family: var(--font-dm-sans,'DM Sans',-apple-system,sans-serif);
          background:#FAFAF8; color:#1A1A1A; line-height:1.6;
          -webkit-font-smoothing:antialiased;
        }
        .lp-display { font-family:var(--font-instrument-serif,Georgia,serif); }
        .lp-container { max-width:1140px; margin:0 auto; padding:0 24px; }

        /* ─── ANIMATIONS ────────────────────────────────────── */
        @keyframes lp-pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes lp-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes lp-shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes lp-glow     { 0%,100%{box-shadow:0 0 20px rgba(89,165,216,.3)} 50%{box-shadow:0 0 40px rgba(89,165,216,.6)} }
        @keyframes lp-spin-slow{ 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes lp-tick     { 0%{stroke-dashoffset:24} 100%{stroke-dashoffset:0} }
        .lp-fade-up  { opacity:0; transform:translateY(28px); transition:all .65s cubic-bezier(.16,1,.3,1); }
        .lp-visible  { opacity:1; transform:translateY(0); }

        /* ─── NAVBAR ────────────────────────────────────────── */
        .lp-nav {
          position:fixed; top:0; left:0; right:0; z-index:100;
          background:rgba(250,250,248,.88); backdrop-filter:blur(14px);
          border-bottom:1px solid rgba(240,237,230,.8);
        }
        .lp-nav-inner { display:flex; align-items:center; justify-content:space-between; height:64px; }
        .lp-logo {
          font-family:var(--font-instrument-serif,Georgia,serif);
          font-size:22px; color:#1A1A1A; text-decoration:none; letter-spacing:-.5px;
        }
        .lp-logo span { color:#386FA4; }
        .lp-nav-links { display:flex; gap:28px; align-items:center; }
        .lp-nav-links a { font-size:14px; color:#6B6B6B; text-decoration:none; transition:color .2s; }
        .lp-nav-links a:hover { color:#1A1A1A; }
        .lp-nav-actions { display:flex; gap:10px; align-items:center; }
        .lp-btn-ghost {
          font-size:14px; color:#6B6B6B; text-decoration:none; padding:8px 18px;
          border-radius:100px; border:1px solid #E5E2DB; background:white; transition:all .2s;
        }
        .lp-btn-ghost:hover { color:#1A1A1A; border-color:#1A1A1A; }
        .lp-btn-nav {
          font-size:14px; font-weight:600; color:white; text-decoration:none; padding:9px 20px;
          border-radius:100px;
          background:linear-gradient(135deg,#386FA4,#133C55);
          transition:all .2s;
        }
        .lp-btn-nav:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(56,111,164,.4); }
        @media(max-width:768px){ .lp-nav-links{display:none} }

        /* ─── HERO ──────────────────────────────────────────── */
        .lp-hero {
          padding:120px 0 80px;
          background:linear-gradient(155deg,#0a2033 0%,#133C55 35%,#1a4a6e 65%,#25608a 100%);
          position:relative; overflow:hidden;
        }
        /* Orbs décoratifs */
        .lp-orb {
          position:absolute; border-radius:50%; pointer-events:none;
          filter:blur(80px); opacity:.25;
        }
        .lp-orb-1 { width:600px; height:600px; top:-200px; right:-150px; background:#59A5D8; }
        .lp-orb-2 { width:400px; height:400px; bottom:-150px; left:-100px; background:#84D2F6; opacity:.15; }
        .lp-orb-3 { width:200px; height:200px; top:40%; left:40%; background:#91E5F6; opacity:.1;
          animation:lp-float 6s ease-in-out infinite; }

        /* Layout hero 2 colonnes */
        .lp-hero-inner {
          display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center;
          position:relative; z-index:2;
        }
        @media(max-width:900px){ .lp-hero-inner{grid-template-columns:1fr; gap:48px;} }

        /* Colonne texte */
        .lp-badge {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15);
          padding:5px 14px; border-radius:100px; font-size:12px; font-weight:500;
          margin-bottom:24px; color:rgba(255,255,255,.85); backdrop-filter:blur(8px);
        }
        .lp-badge-dot {
          width:6px; height:6px; border-radius:50%; background:#84D2F6;
          display:inline-block; animation:lp-pulse 2s infinite;
        }
        .lp-h1 {
          font-family:var(--font-instrument-serif,Georgia,serif);
          font-size:clamp(36px,5vw,64px); line-height:1.06;
          letter-spacing:-2px; margin:0 0 20px; font-weight:400; color:white;
        }
        .lp-h1 em { color:#84D2F6; font-style:italic; }
        .lp-hero-sub {
          font-size:17px; color:rgba(255,255,255,.65); max-width:500px; margin:0 0 32px; line-height:1.7;
        }

        /* CTA hero */
        .lp-hero-cta { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:28px; }
        .lp-btn-hero {
          position:relative; overflow:hidden;
          font-size:16px; font-weight:700; color:#133C55; text-decoration:none;
          padding:16px 36px; border-radius:100px;
          background:linear-gradient(90deg,#ffffff,#e8f5ff,#ffffff);
          background-size:200% auto;
          animation:lp-shimmer 4s linear infinite;
          box-shadow:0 4px 28px rgba(0,0,0,.3); white-space:nowrap; transition:transform .2s;
        }
        .lp-btn-hero:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 8px 36px rgba(0,0,0,.35); }
        .lp-btn-hero-ghost {
          font-size:15px; font-weight:500; color:rgba(255,255,255,.8); text-decoration:none;
          padding:15px 28px; border-radius:100px;
          border:1.5px solid rgba(255,255,255,.2); transition:all .2s; white-space:nowrap;
        }
        .lp-btn-hero-ghost:hover { border-color:rgba(255,255,255,.45); color:white; }

        /* Trust row */
        .lp-trust { display:flex; gap:20px; flex-wrap:wrap; }
        .lp-trust span {
          font-size:12px; color:rgba(255,255,255,.5);
          display:flex; align-items:center; gap:5px;
        }
        .lp-trust .ck { color:#84D2F6; font-size:13px; }

        /* ─── TIMELINE PREVIEW (côté droit du héro) ─────────── */
        .lp-preview {
          background:rgba(255,255,255,.06); backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,.12); border-radius:20px;
          padding:24px; animation:lp-float 7s ease-in-out infinite;
        }
        .lp-preview-header {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom:20px;
        }
        .lp-preview-title {
          font-size:14px; font-weight:600; color:white; display:flex; align-items:center; gap:8px;
        }
        .lp-preview-dots { display:flex; gap:5px; }
        .lp-preview-dot { width:8px; height:8px; border-radius:50%; }
        .lp-preview-dot-r { background:#FF6B6B; }
        .lp-preview-dot-y { background:#FFD93D; }
        .lp-preview-dot-g { background:#6BCB77; }

        /* Barre de progression */
        .lp-preview-prog-wrap { margin-bottom:20px; }
        .lp-preview-prog-label {
          display:flex; justify-content:space-between; margin-bottom:6px;
          font-size:11px; color:rgba(255,255,255,.5);
        }
        .lp-preview-prog-bar {
          height:5px; border-radius:100px; background:rgba(255,255,255,.1); overflow:hidden;
        }
        .lp-preview-prog-fill {
          height:100%; border-radius:100px; width:60%;
          background:linear-gradient(90deg,#59A5D8,#91E5F6);
        }

        /* Items jalon */
        .lp-milestone-item {
          display:flex; align-items:center; gap:12px; padding:10px 12px;
          border-radius:10px; margin-bottom:6px; transition:background .2s;
        }
        .lp-milestone-item:last-child { margin-bottom:0; }
        .lp-ms-done  { background:rgba(107,203,119,.08); }
        .lp-ms-active{ background:rgba(89,165,216,.12); }
        .lp-ms-wait  { background:rgba(255,255,255,.03); }
        .lp-ms-icon {
          width:24px; height:24px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:12px;
        }
        .lp-ms-icon-done  { background:rgba(107,203,119,.2); color:#6BCB77; }
        .lp-ms-icon-active{ background:rgba(89,165,216,.2); color:#84D2F6;
          animation:lp-glow 2.5s ease-in-out infinite; }
        .lp-ms-icon-wait  { background:rgba(255,255,255,.05); color:rgba(255,255,255,.3); }
        .lp-ms-label { flex:1; }
        .lp-ms-name  { font-size:12px; font-weight:500; color:rgba(255,255,255,.85); margin-bottom:1px; }
        .lp-ms-meta  { font-size:10px; color:rgba(255,255,255,.35); }
        .lp-ms-badge {
          font-size:10px; padding:2px 8px; border-radius:100px; font-weight:600; flex-shrink:0;
        }
        .lp-ms-badge-done   { background:rgba(107,203,119,.15); color:#6BCB77; }
        .lp-ms-badge-active { background:rgba(89,165,216,.15); color:#84D2F6; }

        /* Notification flottante */
        .lp-notif {
          display:flex; align-items:center; gap:10px; margin-top:16px;
          background:rgba(107,203,119,.1); border:1px solid rgba(107,203,119,.2);
          border-radius:10px; padding:10px 12px;
        }
        .lp-notif-icon { font-size:16px; flex-shrink:0; }
        .lp-notif-text { font-size:11px; color:rgba(255,255,255,.7); line-height:1.4; }
        .lp-notif-text strong { color:#6BCB77; }

        /* ─── SOCIAL PROOF BAR ──────────────────────────────── */
        .lp-proof {
          padding:32px 0; background:#F5F3EE;
          border-top:1px solid #EAE7E0; border-bottom:1px solid #EAE7E0;
        }
        .lp-proof-inner {
          display:flex; align-items:center; justify-content:center; gap:48px; flex-wrap:wrap;
        }
        .lp-proof-item { display:flex; align-items:center; gap:10px; }
        .lp-proof-icon { font-size:20px; }
        .lp-proof-label { font-size:13px; color:#6B6B6B; }
        .lp-proof-label strong { color:#1A1A1A; display:block; font-size:15px; }
        @media(max-width:640px){ .lp-proof-inner{gap:24px;} }

        /* ─── SECTION HELPERS ───────────────────────────────── */
        .lp-section-label {
          font-size:11px; text-transform:uppercase; letter-spacing:2.5px;
          color:#386FA4; font-weight:700; margin-bottom:10px;
        }
        .lp-section-title {
          font-family:var(--font-instrument-serif,Georgia,serif);
          font-size:clamp(30px,4vw,46px); line-height:1.1;
          letter-spacing:-1px; margin-bottom:14px; font-weight:400;
        }
        .lp-section-sub { font-size:16px; color:#6B6B6B; max-width:540px; line-height:1.65; }

        /* ─── BEFORE / AFTER ────────────────────────────────── */
        .lp-ba { padding:100px 0; }
        .lp-ba-grid {
          display:grid; grid-template-columns:1fr auto 1fr; gap:24px;
          align-items:stretch; margin-top:48px;
        }
        .lp-ba-card { border-radius:18px; padding:32px; }
        .lp-ba-before { background:white; border:1px solid #E5E2DB; }
        .lp-ba-after  {
          background:linear-gradient(145deg,#0a1e2d,#133C55);
          border:1px solid rgba(89,165,216,.2); color:white;
        }
        .lp-ba-arrow {
          display:flex; align-items:center; justify-content:center;
          font-size:28px; color:#59A5D8;
        }
        .lp-ba-head {
          font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px;
          margin-bottom:20px; display:flex; align-items:center; gap:8px;
        }
        .lp-ba-before .lp-ba-head { color:#999; }
        .lp-ba-after  .lp-ba-head { color:#59A5D8; }
        .lp-ba-item {
          padding:9px 0; border-bottom:1px solid rgba(128,128,128,.12);
          font-size:14px; display:flex; align-items:flex-start; gap:10px; line-height:1.5;
        }
        .lp-ba-item:last-child { border-bottom:none; }
        .lp-ba-before .lp-ba-item { color:#6B6B6B; }
        .lp-ba-after  .lp-ba-item { color:rgba(255,255,255,.65); }
        .lp-ba-ico { flex-shrink:0; width:20px; text-align:center; font-size:14px; margin-top:2px; }
        @media(max-width:768px){ .lp-ba-grid{grid-template-columns:1fr;} .lp-ba-arrow{transform:rotate(90deg);} }

        /* ─── TIMELINE FEATURE ──────────────────────────────── */
        .lp-timeline-section { padding:100px 0; background:#0a1e2d; overflow:hidden; }
        .lp-timeline-inner {
          display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center;
        }
        @media(max-width:900px){ .lp-timeline-inner{grid-template-columns:1fr; gap:48px;} }

        /* Texte côté */
        .lp-timeline-section .lp-section-title { color:white; }
        .lp-timeline-section .lp-section-sub   { color:rgba(255,255,255,.5); }
        .lp-timeline-section .lp-section-label { color:#59A5D8; }
        .lp-tl-points { list-style:none; padding:0; margin-top:28px; }
        .lp-tl-points li {
          font-size:14px; color:rgba(255,255,255,.65); padding:8px 0;
          display:flex; align-items:flex-start; gap:10px;
        }
        .lp-tl-points .arrow { color:#59A5D8; font-weight:700; flex-shrink:0; }

        /* Visual timeline demo */
        .lp-tl-demo {
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-radius:20px; padding:28px; position:relative;
        }
        .lp-tl-demo-title {
          font-size:13px; font-weight:600; color:rgba(255,255,255,.5);
          text-transform:uppercase; letter-spacing:1.5px; margin-bottom:24px;
        }
        /* Ligne verticale */
        .lp-tl-steps { position:relative; padding-left:36px; }
        .lp-tl-steps::before {
          content:''; position:absolute; left:11px; top:16px; bottom:16px;
          width:2px;
          background:linear-gradient(to bottom,#386FA4,rgba(56,111,164,.1));
        }
        .lp-tl-step { position:relative; margin-bottom:20px; }
        .lp-tl-step:last-child { margin-bottom:0; }
        .lp-tl-node {
          position:absolute; left:-36px; top:0;
          width:24px; height:24px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700; flex-shrink:0;
        }
        .lp-tl-node-done   { background:#6BCB77; color:#0a1e2d; }
        .lp-tl-node-active {
          background:#386FA4; color:white;
          box-shadow:0 0 0 4px rgba(56,111,164,.25);
          animation:lp-glow 2.5s ease-in-out infinite;
        }
        .lp-tl-node-wait   { background:rgba(255,255,255,.08); border:1.5px solid rgba(255,255,255,.15); color:rgba(255,255,255,.3); }
        .lp-tl-step-content {
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06);
          border-radius:10px; padding:12px 14px;
          transition:background .2s;
        }
        .lp-tl-step-content:hover { background:rgba(255,255,255,.07); }
        .lp-tl-step-top {
          display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;
        }
        .lp-tl-step-name { font-size:13px; font-weight:600; color:rgba(255,255,255,.85); }
        .lp-tl-step-tag {
          font-size:10px; font-weight:600; padding:2px 8px; border-radius:100px;
        }
        .lp-tl-tag-done   { background:rgba(107,203,119,.15); color:#6BCB77; }
        .lp-tl-tag-active { background:rgba(56,111,164,.2); color:#84D2F6; }
        .lp-tl-tag-wait   { background:rgba(255,255,255,.05); color:rgba(255,255,255,.3); }
        .lp-tl-step-sub { font-size:11px; color:rgba(255,255,255,.35); }
        .lp-tl-step-sub span { color:#59A5D8; margin-right:4px; }

        /* ─── FEATURES GRID ─────────────────────────────────── */
        .lp-features { padding:100px 0; }
        .lp-features-header { text-align:center; margin-bottom:64px; }
        .lp-feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
        @media(max-width:900px){ .lp-feat-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:600px){ .lp-feat-grid{grid-template-columns:1fr;} }

        .lp-feat-card {
          background:white; border:1px solid #F0EDE6; border-radius:18px;
          padding:28px; transition:all .3s; position:relative; overflow:hidden;
        }
        .lp-feat-card:hover { border-color:#D0E6F5; transform:translateY(-3px); box-shadow:0 8px 32px rgba(56,111,164,.08); }
        .lp-feat-card.star {
          border:1.5px solid #59A5D8;
          background:linear-gradient(145deg,#f8fcff,white);
        }
        .lp-feat-card.star::after {
          content:'⭐ Cœur du produit'; position:absolute; top:12px; right:12px;
          font-size:10px; font-weight:600; padding:3px 10px; border-radius:100px;
          background:#EBF4FB; color:#386FA4;
        }
        .lp-feat-emoji { font-size:30px; margin-bottom:14px; display:block; }
        .lp-feat-card h3 { font-size:16px; font-weight:700; margin-bottom:6px; color:#1A1A1A; }
        .lp-feat-card p  { font-size:13.5px; color:#6B6B6B; line-height:1.65; }
        .lp-feat-list { list-style:none; padding:0; margin-top:10px; }
        .lp-feat-list li { font-size:12px; color:#888; padding:3px 0 3px 16px; position:relative; }
        .lp-feat-list li::before {
          content:''; position:absolute; left:0; top:10px;
          width:5px; height:5px; border-radius:50%; background:#D0E6F5;
        }
        .lp-feat-wide { grid-column:span 2; }
        @media(max-width:600px){ .lp-feat-wide{grid-column:span 1;} }

        /* ─── HOW IT WORKS ──────────────────────────────────── */
        .lp-how { padding:100px 0; background:#F5F3EE; }
        .lp-how-steps {
          display:grid; grid-template-columns:repeat(4,1fr); gap:0;
          margin-top:56px; position:relative;
        }
        .lp-how-steps::after {
          content:''; position:absolute; top:28px; left:12%; right:12%;
          height:2px; background:linear-gradient(90deg,#E5E2DB,#D0E6F5,#E5E2DB);
          z-index:0;
        }
        .lp-how-step { position:relative; z-index:1; padding:0 16px; text-align:center; }
        .lp-how-num {
          width:56px; height:56px; border-radius:50%; border:2px solid #D0E6F5;
          background:white; color:#386FA4; font-size:18px; font-weight:700;
          display:flex; align-items:center; justify-content:center; margin:0 auto 16px;
          box-shadow:0 4px 16px rgba(56,111,164,.1);
        }
        .lp-how-step h3 { font-size:15px; font-weight:700; margin-bottom:6px; color:#1A1A1A; }
        .lp-how-step p  { font-size:13px; color:#6B6B6B; line-height:1.6; }
        @media(max-width:768px){
          .lp-how-steps{grid-template-columns:1fr 1fr; gap:32px;}
          .lp-how-steps::after{display:none;}
        }
        @media(max-width:480px){ .lp-how-steps{grid-template-columns:1fr;} }

        /* ─── GAINS ─────────────────────────────────────────── */
        .lp-gains { padding:80px 0; }
        .lp-gains-grid {
          display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:48px;
        }
        @media(max-width:640px){ .lp-gains-grid{grid-template-columns:1fr 1fr;} }
        .lp-gain-card {
          background:white; border:1px solid #F0EDE6; border-radius:18px;
          padding:28px 24px; text-align:center; transition:all .3s;
        }
        .lp-gain-card:hover { border-color:#D0E6F5; transform:translateY(-2px); }
        .lp-gain-n {
          font-family:var(--font-instrument-serif,Georgia,serif);
          font-size:46px; color:#386FA4; line-height:1; margin-bottom:6px;
        }
        .lp-gain-l { font-size:13px; color:#6B6B6B; line-height:1.45; }

        /* ─── AUDIENCE ──────────────────────────────────────── */
        .lp-audience { padding:80px 0; background:#F5F3EE; }
        .lp-aud-grid {
          display:grid; grid-template-columns:repeat(3,1fr); gap:16px;
          margin-top:40px; max-width:860px; margin-left:auto; margin-right:auto;
        }
        .lp-aud-card {
          background:white; border-radius:16px; padding:24px; text-align:center;
          transition:all .3s; border:1px solid transparent;
        }
        .lp-aud-card:hover { border-color:#D0E6F5; transform:translateY(-2px); }
        .lp-aud-emoji { font-size:34px; margin-bottom:12px; }
        .lp-aud-card h3 { font-size:15px; font-weight:700; margin-bottom:4px; color:#1A1A1A; }
        .lp-aud-card p  { font-size:13px; color:#6B6B6B; line-height:1.55; }
        @media(max-width:640px){ .lp-aud-grid{grid-template-columns:1fr 1fr;} }

        /* ─── SOVEREIGNTY ───────────────────────────────────── */
        .lp-sovereignty { padding:80px 0; }
        .lp-sov-box { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; }
        .lp-sov-vis {
          background:linear-gradient(145deg,#0a1e2d,#133C55);
          border-radius:20px; padding:40px; text-align:center; position:relative; overflow:hidden;
        }
        .lp-sov-vis::before {
          content:''; position:absolute; top:-30%; right:-30%;
          width:300px; height:300px;
          background:radial-gradient(circle,rgba(89,165,216,.15) 0%,transparent 70%);
        }
        .lp-sov-flag { font-size:60px; margin-bottom:14px; position:relative; }
        .lp-sov-vis h3 { font-size:18px; font-weight:600; color:white; margin-bottom:8px; position:relative; }
        .lp-sov-vis p  { font-size:13px; color:rgba(255,255,255,.4); position:relative; }
        .lp-sov-txt h3 { font-size:22px; font-weight:700; margin-bottom:10px; }
        .lp-sov-txt > p { font-size:15px; color:#6B6B6B; line-height:1.7; margin-bottom:16px; }
        .lp-sov-pts { list-style:none; padding:0; }
        .lp-sov-pts li { font-size:14px; padding:7px 0; display:flex; align-items:flex-start; gap:10px; }
        .lp-sov-pts .arr { color:#386FA4; font-weight:700; flex-shrink:0; }
        @media(max-width:768px){ .lp-sov-box{grid-template-columns:1fr;} }

        /* ─── PRICING ───────────────────────────────────────── */
        .lp-pricing { padding:80px 0; background:#F5F3EE; }
        .lp-pricing-cards {
          display:grid; grid-template-columns:repeat(3,1fr); gap:16px;
          margin-top:40px;
        }
        @media(max-width:768px){ .lp-pricing-cards{grid-template-columns:1fr; max-width:420px; margin-left:auto; margin-right:auto;} }
        .lp-pricing-card {
          background:white; border:1px solid #F0EDE6; border-radius:20px; padding:32px;
        }
        .lp-pricing-card.featured {
          border:2px solid #386FA4; position:relative;
          background:linear-gradient(145deg,#f8fcff,white);
        }
        .lp-pricing-card.featured::before {
          content:'⭐ Le plus populaire'; position:absolute; top:-13px; left:50%; transform:translateX(-50%);
          font-size:11px; font-weight:700; padding:4px 16px; border-radius:100px;
          background:linear-gradient(90deg,#386FA4,#133C55); color:white; white-space:nowrap;
        }
        .lp-pricing-card h3 { font-size:20px; font-weight:700; margin-bottom:4px; }
        .lp-pricing-price {
          font-family:var(--font-instrument-serif,Georgia,serif);
          font-size:42px; color:#1A1A1A; margin:12px 0 4px;
        }
        .lp-pricing-price span { font-size:15px; color:#6B6B6B; font-family:var(--font-dm-sans,sans-serif); }
        .lp-pricing-desc { font-size:13px; color:#6B6B6B; margin-bottom:20px; }
        .lp-pricing-list { list-style:none; text-align:left; padding:0; margin-bottom:24px; }
        .lp-pricing-list li {
          font-size:13px; padding:5px 0; display:flex; align-items:flex-start; gap:8px; color:#6B6B6B;
        }
        .lp-pricing-list li::before { content:'✓'; color:#2D8A56; font-weight:700; flex-shrink:0; }
        .lp-pricing-cta {
          display:block; text-align:center; text-decoration:none; font-weight:700;
          padding:13px 24px; border-radius:100px; font-size:14px; transition:all .2s;
        }
        .lp-pricing-cta-outline { border:1.5px solid #E5E2DB; color:#1A1A1A; }
        .lp-pricing-cta-outline:hover { border-color:#386FA4; color:#386FA4; }
        .lp-pricing-cta-primary {
          background:linear-gradient(135deg,#386FA4,#133C55); color:white;
          box-shadow:0 4px 16px rgba(56,111,164,.3);
        }
        .lp-pricing-cta-primary:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(56,111,164,.4); }
        .lp-pricing-cta-agency {
          background:#0a1e2d; color:rgba(255,255,255,.8);
        }
        .lp-pricing-cta-agency:hover { background:#133C55; color:white; }

        /* ─── CTA FINALE ─────────────────────────────────────── */
        .lp-cta-section { padding:0 0 100px; background:#F5F3EE; }
        .lp-cta-box {
          position:relative; overflow:hidden;
          background:linear-gradient(135deg,#0a1e2d 0%,#133C55 40%,#1a4a6e 75%,#25608a 100%);
          border-radius:28px; padding:80px 48px; text-align:center;
        }
        /* Orbs internes */
        .lp-cta-orb {
          position:absolute; border-radius:50%; pointer-events:none; filter:blur(60px);
        }
        .lp-cta-orb-1 { width:400px; height:400px; top:-150px; right:-100px; background:#59A5D8; opacity:.15; }
        .lp-cta-orb-2 { width:300px; height:300px; bottom:-120px; left:-80px;  background:#84D2F6; opacity:.1; }
        /* Cercle décoratif animé */
        .lp-cta-ring {
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:500px; height:500px; border-radius:50%;
          border:1px solid rgba(89,165,216,.08);
          animation:lp-spin-slow 30s linear infinite;
          pointer-events:none;
        }
        .lp-cta-ring-2 {
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:700px; height:700px; border-radius:50%;
          border:1px solid rgba(89,165,216,.05);
          animation:lp-spin-slow 50s linear infinite reverse;
          pointer-events:none;
        }
        .lp-cta-content { position:relative; z-index:2; }
        .lp-cta-tag {
          display:inline-flex; align-items:center; gap:8px;
          background:rgba(89,165,216,.1); border:1px solid rgba(89,165,216,.2);
          padding:5px 16px; border-radius:100px; font-size:12px; font-weight:600;
          color:#84D2F6; margin-bottom:24px; text-transform:uppercase; letter-spacing:1.5px;
        }
        .lp-cta-h2 {
          font-family:var(--font-instrument-serif,Georgia,serif);
          font-size:clamp(34px,5vw,62px); color:white; margin-bottom:16px;
          font-weight:400; letter-spacing:-1.5px; line-height:1.07;
        }
        .lp-cta-h2 em { color:#84D2F6; font-style:italic; }
        .lp-cta-sub {
          color:rgba(255,255,255,.55); font-size:17px; margin-bottom:40px;
          max-width:480px; margin-left:auto; margin-right:auto; line-height:1.65;
        }
        .lp-cta-buttons { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-bottom:32px; }

        /* Bouton CTA principal — wow effect */
        .lp-btn-cta {
          position:relative; overflow:hidden;
          font-size:17px; font-weight:800; color:#0a1e2d; text-decoration:none;
          padding:18px 48px; border-radius:100px;
          background:linear-gradient(90deg,#ffffff 0%,#e8f5ff 30%,#84D2F6 50%,#e8f5ff 70%,#ffffff 100%);
          background-size:300% auto;
          animation:lp-shimmer 3.5s linear infinite;
          box-shadow:0 6px 40px rgba(0,0,0,.4); white-space:nowrap;
          transition:transform .2s, box-shadow .2s;
          letter-spacing:-.3px;
        }
        .lp-btn-cta:hover { transform:translateY(-3px) scale(1.03); box-shadow:0 12px 48px rgba(0,0,0,.45); }
        .lp-btn-cta-ghost {
          font-size:15px; font-weight:500; color:rgba(255,255,255,.7); text-decoration:none;
          padding:17px 32px; border-radius:100px;
          border:1.5px solid rgba(255,255,255,.15); transition:all .2s; white-space:nowrap;
        }
        .lp-btn-cta-ghost:hover { border-color:rgba(255,255,255,.4); color:white; }
        /* Perks */
        .lp-cta-perks { display:flex; justify-content:center; gap:28px; flex-wrap:wrap; }
        .lp-cta-perks span { font-size:13px; color:rgba(255,255,255,.4); display:flex; align-items:center; gap:6px; }
        .lp-cta-perks .ck { color:#6BCB77; font-size:15px; }
        @media(max-width:768px){
          .lp-cta-box{padding:56px 24px;}
          .lp-cta-perks{flex-direction:column; align-items:center; gap:10px;}
          .lp-cta-ring,.lp-cta-ring-2{display:none;}
        }

        /* ─── ROADMAP ────────────────────────────────────────── */
        .lp-roadmap { padding:100px 0; background:#0a1e2d; }
        .lp-roadmap .lp-section-title { color:white; }
        .lp-roadmap .lp-section-sub   { color:rgba(255,255,255,.4); }
        .lp-roadmap .lp-section-label { color:#59A5D8; }
        .lp-roadmap-timeline { margin-top:56px; position:relative; }
        .lp-roadmap-timeline::before {
          content:''; position:absolute; left:31px; top:0; bottom:0;
          width:2px; background:linear-gradient(to bottom,#386FA4,rgba(56,111,164,.1));
        }
        .lp-roadmap-item { display:flex; gap:24px; margin-bottom:40px; position:relative; }
        .lp-roadmap-item:last-child { margin-bottom:0; }
        .lp-roadmap-dot {
          width:62px; height:62px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:800; flex-shrink:0; position:relative; z-index:2;
        }
        .lp-dot-on  { background:linear-gradient(135deg,#386FA4,#133C55); color:white; box-shadow:0 0 0 6px rgba(56,111,164,.15); }
        .lp-dot-off { background:#111a26; border:2px solid #1e2d3d; color:#334; }
        .lp-roadmap-content { padding-top:8px; flex:1; }
        .lp-roadmap-content h3 { font-size:19px; font-weight:700; margin-bottom:4px; color:white; }
        .lp-r-ver { font-size:11px; color:#59A5D8; font-weight:700; margin-bottom:5px; display:inline-block; text-transform:uppercase; letter-spacing:1px; }
        .lp-roadmap-content p { font-size:14px; color:rgba(255,255,255,.45); line-height:1.7; max-width:520px; }
        .lp-r-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
        .lp-r-tag { font-size:11px; padding:3px 10px; border-radius:100px; background:#111a26; border:1px solid #1e2d3d; color:rgba(255,255,255,.4); }

        /* ─── FOOTER ─────────────────────────────────────────── */
        .lp-footer { padding:64px 0 0; border-top:1px solid #F0EDE6; background:#FAFAF8; }
        .lp-footer-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:48px; padding-bottom:48px; }
        .lp-footer-brand p { font-size:13.5px; color:#6B6B6B; line-height:1.7; margin-top:12px; max-width:260px; }
        .lp-footer-badges { display:flex; gap:8px; margin-top:18px; flex-wrap:wrap; }
        .lp-footer-badge {
          font-size:11px; padding:4px 10px; border-radius:100px;
          background:#EBF4FB; color:#386FA4; border:1px solid #D0E6F5; font-weight:600;
        }
        .lp-footer-col h4 { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:#1A1A1A; margin-bottom:16px; }
        .lp-footer-col a  { display:block; font-size:13.5px; color:#6B6B6B; text-decoration:none; padding:4px 0; transition:color .2s; }
        .lp-footer-col a:hover { color:#1A1A1A; }
        .lp-footer-bottom {
          border-top:1px solid #F0EDE6; padding:20px 0;
          display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
        }
        .lp-footer-bottom p { font-size:12px; color:#AAA; }
        .lp-footer-bottom a { color:#AAA; text-decoration:none; }
        .lp-footer-bottom a:hover { color:#6B6B6B; }
        @media(max-width:900px){ .lp-footer-grid{grid-template-columns:1fr 1fr;} }
        @media(max-width:540px){
          .lp-footer-grid{grid-template-columns:1fr; gap:32px;}
          .lp-footer-bottom{flex-direction:column; text-align:center;}
        }

        /* ─── GLOBAL RESPONSIVE ─────────────────────────────── */
        @media(max-width:768px){
          .lp-ba,.lp-features,.lp-gains,.lp-how,.lp-audience,.lp-sovereignty,.lp-cta-section { padding:64px 0; }
          .lp-roadmap,.lp-timeline-section { padding:64px 0; }
          .lp-hero { padding:100px 0 60px; }
        }
      `}</style>

      <div className="lp-root">

        {/* ── NAVBAR ─────────────────────────────────────────── */}
        <nav className="lp-nav">
          <div className="lp-container lp-nav-inner">
            <a href="/" className="lp-logo">Hub<span>lio</span></a>
            <div className="lp-nav-links">
              <a href="#features">Fonctionnalités</a>
              <a href="#pricing">Tarifs</a>
            </div>
            <div className="lp-nav-actions">
              <Link href="/login" className="lp-btn-ghost">Se connecter</Link>
              <Link href="/signup" className="lp-btn-nav">Essayer gratuitement →</Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />
          <div className="lp-container">
            <div className="lp-hero-inner">

              {/* Texte */}
              <div>
                <div className="lp-badge">
                  <span className="lp-badge-dot" />
                  Bêta ouverte · Gratuit sans carte bancaire
                </div>
                <h1 className="lp-h1">
                  Vos projets clients,<br />
                  <em>enfin pilotés</em><br />
                  sans effort.
                </h1>
                <p className="lp-hero-sub">
                  Onboarding, timeline de jalons, portail client dédié, documents — tout centralisé en un seul endroit. Zéro email de coordination.
                </p>
                <div className="lp-hero-cta">
                  <Link href="/signup" className="lp-btn-hero">
                    Démarrer gratuitement — sans CB ✦
                  </Link>
                </div>
                <div className="lp-trust">
                  <span><span className="ck">✓</span> Sans carte bancaire</span>
                  <span><span className="ck">✓</span> Hébergé en France</span>
                  <span><span className="ck">✓</span> 3 min pour démarrer</span>
                </div>
              </div>

              {/* Aperçu timeline */}
              <div className="lp-preview">
                <div className="lp-preview-header">
                  <div className="lp-preview-title">
                    📂 Site vitrine — 5 jalons
                  </div>
                  <div className="lp-preview-dots">
                    <div className="lp-preview-dot lp-preview-dot-r" />
                    <div className="lp-preview-dot lp-preview-dot-y" />
                    <div className="lp-preview-dot lp-preview-dot-g" />
                  </div>
                </div>
                <div className="lp-preview-prog-wrap">
                  <div className="lp-preview-prog-label">
                    <span>Avancement</span><span>60%</span>
                  </div>
                  <div className="lp-preview-prog-bar">
                    <div className="lp-preview-prog-fill" />
                  </div>
                </div>
                {[
                  { icon:"✓", cls:"lp-ms-done",   ico:"lp-ms-icon-done",   label:"Brief & onboarding",      meta:"Complété le 14 avr.",  badge:"Terminé",    bc:"lp-ms-badge-done" },
                  { icon:"✓", cls:"lp-ms-done",   ico:"lp-ms-icon-done",   label:"Maquettes wireframes",    meta:"Validé par le client", badge:"Terminé",    bc:"lp-ms-badge-done" },
                  { icon:"⟳", cls:"lp-ms-active", ico:"lp-ms-icon-active", label:"Design UI — écrans clés", meta:"En cours · J-3",       badge:"En cours",   bc:"lp-ms-badge-active" },
                  { icon:"○", cls:"lp-ms-wait",   ico:"lp-ms-icon-wait",   label:"Intégration & dev",       meta:"Planifié",             badge:"À venir",    bc:"" },
                  { icon:"○", cls:"lp-ms-wait",   ico:"lp-ms-icon-wait",   label:"Mise en ligne",           meta:"Planifié",             badge:"À venir",    bc:"" },
                ].map((m) => (
                  <div key={m.label} className={`lp-milestone-item ${m.cls}`}>
                    <div className={`lp-ms-icon ${m.ico}`}>{m.icon}</div>
                    <div className="lp-ms-label">
                      <div className="lp-ms-name">{m.label}</div>
                      <div className="lp-ms-meta">{m.meta}</div>
                    </div>
                    {m.bc && <span className={`lp-ms-badge ${m.bc}`}>{m.badge}</span>}
                  </div>
                ))}
                <div className="lp-notif">
                  <span className="lp-notif-icon">🔔</span>
                  <div className="lp-notif-text">
                    <strong>Sophie M.</strong> a validé les maquettes — il y a 2h
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ──────────────────────────────────── */}
        <div className="lp-proof">
          <div className="lp-container">
            <div className="lp-proof-inner">
              {[
                { icon:"⚡", label:<><strong>3 minutes</strong>pour onboarder un client</> },
                { icon:"🇫🇷", label:<><strong>100% France</strong>données hébergées à Paris</> },
                { icon:"🔒", label:<><strong>RGPD natif</strong>chiffrement AES-256</> },
                { icon:"🎁", label:<><strong>Gratuit</strong>sans carte bancaire</> },
              ].map((p,i) => (
                <div key={i} className="lp-proof-item">
                  <span className="lp-proof-icon">{p.icon}</span>
                  <span className="lp-proof-label">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BEFORE / AFTER ────────────────────────────────── */}
        <section className="lp-ba" id="features">
          <div className="lp-container">
            <div style={{textAlign:"center"}}>
              <div className="lp-section-label">Avant / Après</div>
              <div className="lp-section-title">Fini le chaos d'outils</div>
              <p className="lp-section-sub" style={{margin:"0 auto"}}>
                Comparez votre quotidien actuel avec ce que {APP_CONFIG.name} vous apporte.
              </p>
            </div>
            <div className="lp-ba-grid">
              <div className="lp-ba-card lp-ba-before lp-fade-up">
                <div className="lp-ba-head">😰 Avant</div>
                {[
                  {i:"📧",t:"Onboarding par email : vous relancez, perdez des fichiers, reformattez des infos"},
                  {i:"📊",t:"Suivi projet sur un Google Sheet que personne ne lit vraiment"},
                  {i:"📁",t:"Fichiers éparpillés : WeTransfer, Drive, Dropbox, email… impossible à retrouver"},
                  {i:"📅",t:"Allers-retours pour caler une réunion, liens Meet à générer à la main"},
                  {i:"🧾",t:"Devis et factures en PDF envoyés par email, statuts jamais à jour"},
                  {i:"😤",t:"Le client vous relance pour avoir des nouvelles — 30 min perdues à répondre"},
                ].map((item,i) => (
                  <div key={i} className="lp-ba-item">
                    <span className="lp-ba-ico">{item.i}</span>{item.t}
                  </div>
                ))}
              </div>
              <div className="lp-ba-arrow">→</div>
              <div className="lp-ba-card lp-ba-after lp-fade-up">
                <div className="lp-ba-head">✨ Avec {APP_CONFIG.name}</div>
                {[
                  {i:"✅",t:"Formulaire d'onboarding sur mesure envoyé en 2 clics — tout centralisé automatiquement"},
                  {i:"📍",t:"Timeline de jalons en temps réel, visible par le client dans son portail dédié"},
                  {i:"🗂️",t:"Tous les fichiers au même endroit : upload, download, ZIP groupé"},
                  {i:"📆",t:"Réservation de créneau intégrée, Google Meet créé automatiquement (v3)"},
                  {i:"📑",t:"Espace devis & factures dans le portail client — statuts en temps réel (v2)"},
                  {i:"👤",t:"Le client voit l'avancement en direct, valide les étapes — zéro email de relance"},
                ].map((item,i) => (
                  <div key={i} className="lp-ba-item">
                    <span className="lp-ba-ico">{item.i}</span>{item.t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TIMELINE SECTION ──────────────────────────────── */}
        <section className="lp-timeline-section">
          <div className="lp-container">
            <div className="lp-timeline-inner">

              {/* Texte */}
              <div className="lp-fade-up">
                <div className="lp-section-label">Timeline de jalons</div>
                <div className="lp-section-title">Votre projet, étape par étape</div>
                <p className="lp-section-sub">
                  Créez une timeline visuelle pour chaque projet. Vos clients voient la progression en temps réel et valident chaque étape directement depuis leur portail.
                </p>
                <ul className="lp-tl-points">
                  {[
                    "Jalons avec priorités, dates, responsable (freelance ou client)",
                    "Sous-tâches intégrées à chaque étape",
                    "6 templates prêts à l'emploi (site web, app, CM, design…)",
                    "Import de template en un clic sur n'importe quel projet",
                    "Notifications email automatiques à la complétion",
                    "Visible ou masqué côté client selon l'étape",
                  ].map((p) => (
                    <li key={p}><span className="arrow">→</span>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Demo visuelle */}
              <div className="lp-tl-demo lp-fade-up">
                <div className="lp-tl-demo-title">📍 Timeline projet</div>
                <div className="lp-tl-steps">
                  {[
                    { n:"1", cls:"lp-tl-node-done",   name:"Brief & onboarding",      tag:"Terminé",    tc:"lp-tl-tag-done",   sub:"Validé le 10 avr.", resp:"👤 Client" },
                    { n:"2", cls:"lp-tl-node-done",   name:"Maquettes wireframes",    tag:"Terminé",    tc:"lp-tl-tag-done",   sub:"Validé le 16 avr.", resp:"🎨 Freelance" },
                    { n:"3", cls:"lp-tl-node-active", name:"Design UI — écrans clés", tag:"En cours",   tc:"lp-tl-tag-active", sub:"Deadline : 28 avr.", resp:"🎨 Freelance" },
                    { n:"4", cls:"lp-tl-node-wait",   name:"Intégration & développement", tag:"À venir", tc:"lp-tl-tag-wait", sub:"Priorité haute",   resp:"🎨 Freelance" },
                    { n:"5", cls:"lp-tl-node-wait",   name:"Validation client finale",tag:"À venir",    tc:"lp-tl-tag-wait",   sub:"Priorité urgente", resp:"👤 Client" },
                    { n:"6", cls:"lp-tl-node-wait",   name:"Mise en ligne",           tag:"À venir",    tc:"lp-tl-tag-wait",   sub:"Milestone final",  resp:"🎨 Freelance" },
                  ].map((s) => (
                    <div key={s.n} className="lp-tl-step">
                      <div className={`lp-tl-node ${s.cls}`}>{s.n}</div>
                      <div className="lp-tl-step-content">
                        <div className="lp-tl-step-top">
                          <span className="lp-tl-step-name">{s.name}</span>
                          <span className={`lp-tl-step-tag ${s.tc}`}>{s.tag}</span>
                        </div>
                        <div className="lp-tl-step-sub">
                          <span>{s.resp}</span>{s.sub}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── FEATURES GRID ─────────────────────────────────── */}
        <section className="lp-features">
          <div className="lp-container">
            <div className="lp-features-header">
              <div className="lp-section-label">Fonctionnalités</div>
              <div className="lp-section-title">Tout ce dont vous avez besoin</div>
              <p className="lp-section-sub" style={{margin:"0 auto"}}>
                De l'onboarding à la livraison, chaque étape du projet est couverte.
              </p>
            </div>
            <div className="lp-feat-grid">
              <div className="lp-feat-card star lp-fade-up">
                <span className="lp-feat-emoji">🎯</span>
                <h3>Onboarding client automatisé</h3>
                <p>Formulaires sur mesure avec 9 types de champs. Envoyez un lien — votre client remplit sans créer de compte.</p>
                <ul className="lp-feat-list">
                  <li>Sections et champs réorganisables</li>
                  <li>Sauvegarde auto de la progression</li>
                  <li>Notification email dès la soumission</li>
                </ul>
              </div>
              <div className="lp-feat-card star lp-fade-up">
                <span className="lp-feat-emoji">📍</span>
                <h3>Timeline de jalons</h3>
                <p>Une timeline visuelle par projet avec drag & drop. Chaque étape a ses priorités, dates, responsable et sous-tâches.</p>
                <ul className="lp-feat-list">
                  <li>6 templates métier prêts à l'emploi</li>
                  <li>Import de template en 1 clic</li>
                  <li>Visible ou masqué côté client</li>
                </ul>
              </div>
              <div className="lp-feat-card lp-fade-up">
                <span className="lp-feat-emoji">👤</span>
                <h3>Portail client dédié</h3>
                <p>Chaque client dispose d'un espace personnel pour suivre ses projets, voir les jalons et télécharger ses fichiers.</p>
                <ul className="lp-feat-list">
                  <li>Branding personnalisé (v2)</li>
                  <li>Avancement en temps réel</li>
                  <li>Notifications automatiques</li>
                </ul>
              </div>
              <div className="lp-feat-card lp-fade-up">
                <span className="lp-feat-emoji">✅</span>
                <h3>Livrables & validations</h3>
                <p>Soumettez des livrables à la validation client. Commentaires, approbation ou demande de modification directement dans le portail.</p>
                <ul className="lp-feat-list">
                  <li>Workflow de validation intégré</li>
                  <li>Historique des révisions</li>
                  <li>Notification email au client</li>
                </ul>
              </div>
              <div className="lp-feat-card lp-fade-up">
                <span className="lp-feat-emoji">💬</span>
                <h3>Messagerie projet (v2)</h3>
                <p>Un chat dédié par projet. Messages internes vs client, notifications, historique complet. Fini les emails perdus.</p>
                <ul className="lp-feat-list">
                  <li>Messages internes vs client</li>
                  <li>Notifications en temps réel</li>
                  <li>Historique complet</li>
                </ul>
              </div>
              <div className="lp-feat-card lp-fade-up">
                <span className="lp-feat-emoji">📁</span>
                <h3>Gestion de fichiers</h3>
                <p>Tous les documents au même endroit : onboarding, livrables, factures. Upload, download, ZIP groupé. Stockage sécurisé en France.</p>
                <ul className="lp-feat-list">
                  <li>Stockage RGPD (datacenter Paris)</li>
                  <li>Jusqu'à 200 Mo par fichier</li>
                  <li>Téléchargement groupé en ZIP</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────── */}
        <section className="lp-pricing" id="pricing">
          <div className="lp-container">
            <div style={{textAlign:"center"}}>
              <div className="lp-section-label">Tarifs</div>
              <div className="lp-section-title">Gratuit pour démarrer.<br />Flexible pour grandir.</div>
              <p className="lp-section-sub" style={{margin:"0 auto"}}>
                Commencez sans sortir la carte. Passez au plan payant quand vous avez besoin de plus de puissance.
              </p>
            </div>
            <div className="lp-pricing-cards">
              <div className="lp-pricing-card lp-fade-up">
                <h3>Gratuit</h3>
                <div className="lp-pricing-price">0€</div>
                <div className="lp-pricing-desc">Pour tester et démarrer</div>
                <ul className="lp-pricing-list">
                  {[
                    "1 projet actif",
                    "Onboarding client + formulaires",
                    "Timeline de jalons",
                    "Portail client",
                    "Validations d'étapes",
                    "Espace devis et factures",
                    "Notifications email",
                    "1 Go de stockage",
                    "Templates métier inclus",
                  ].map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href="/signup" className="lp-pricing-cta lp-pricing-cta-outline">Commencer gratuitement</Link>
              </div>
              <div className="lp-pricing-card featured lp-fade-up">
                <h3>Pro</h3>
                <div className="lp-pricing-price">14€<span>/mois</span></div>
                <div className="lp-pricing-desc">Pour les freelances qui veulent aller plus loin</div>
                <ul className="lp-pricing-list">
                  {[
                    "1 projet actif",
                    "Onboarding client + formulaires",
                    "Timeline de jalons",
                    "Portail client",
                    "Validations d'étapes",
                    "Espace devis et factures",
                    "Notifications email",
                    "Templates métier inclus",
                    "Projets illimités",
                    "20 Go de stockage",
                    "Synchronisation Google Calendar + Meet",
                    "Retranscription et résumé de vos réunions (Soon)",
                    "Marque blanche",
                  ].map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href="/signup" className="lp-pricing-cta lp-pricing-cta-primary">Démarrer l'essai gratuit</Link>
              </div>
              <div className="lp-pricing-card lp-fade-up">
                <h3>Agence</h3>
                <div className="lp-pricing-price">39€<span>/mois</span></div>
                <div className="lp-pricing-desc">Pour les agences qui grandissent</div>
                <ul className="lp-pricing-list">
                  {[
                    "1 projet actif",
                    "Onboarding client + formulaires",
                    "Timeline de jalons",
                    "Portail client",
                    "Validations d'étapes",
                    "Espace devis et factures",
                    "Notifications email",
                    "Templates métier inclus",
                    "Projets illimités",
                    "20 Go de stockage",
                    "Synchronisation Google Calendar + Meet",
                    "Retranscription et résumé de vos réunions (Soon)",
                    "Multi-utilisateurs",
                    "100 Go de stockage",
                    "Marque blanche",
                    "Support prioritaire",
                  ].map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href="/signup" className="lp-pricing-cta lp-pricing-cta-agency">Commencer maintenant</Link>
              </div>
            </div>
          </div>
        </section>


        {/* ── CTA FINALE ────────────────────────────────────── */}
        <section className="lp-cta-section">
          <div className="lp-container">
            <div className="lp-cta-box lp-fade-up">
              <div className="lp-cta-orb lp-cta-orb-1" />
              <div className="lp-cta-orb lp-cta-orb-2" />
              <div className="lp-cta-ring" />
              <div className="lp-cta-ring-2" />
              <div className="lp-cta-content">
                <div className="lp-cta-tag">
                  <span className="lp-badge-dot" />
                  Bêta ouverte maintenant
                </div>
                <h2 className="lp-cta-h2">
                  Lancez-vous.<br />
                  C'est <em>gratuit</em>,<br />
                  sans carte bancaire.
                </h2>
                <p className="lp-cta-sub">
                  Créez votre premier projet en 3 minutes. Aucune installation, aucune CB. Juste un compte et vous êtes prêt à onboarder votre prochain client.
                </p>
                <div className="lp-cta-buttons">
                  <Link href="/signup" className="lp-btn-cta">
                    ✦ Créer mon compte gratuitement
                  </Link>
                </div>
                <div className="lp-cta-perks">
                  <span><span className="ck">✓</span> Gratuit sans limite de durée</span>
                  <span><span className="ck">✓</span> Aucune carte bancaire requise</span>
                  <span><span className="ck">✓</span> Données hébergées en France</span>
                  <span><span className="ck">✓</span> 3 minutes pour démarrer</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <footer className="lp-footer">
          <div className="lp-container">
            <div className="lp-footer-grid">
              <div className="lp-footer-brand">
                <a href="/" className="lp-logo" style={{display:"block"}}>{APP_CONFIG.name}</a>
                <p>La plateforme de gestion de projet client tout-en-un pour les freelances et agences. Conçue en France.</p>
                <div className="lp-footer-badges">
                  <span className="lp-footer-badge">🇫🇷 Hébergé en France</span>
                  <span className="lp-footer-badge">✓ RGPD</span>
                  <span className="lp-footer-badge">🔒 Chiffré</span>
                </div>
              </div>
              <div className="lp-footer-col">
                <h4>Produit</h4>
                <a href="#features">Fonctionnalités</a>
                <a href="#pricing">Tarifs</a>
              </div>
              <div className="lp-footer-col">
                <h4>Compte</h4>
                <Link href="/signup">Créer un compte</Link>
                <Link href="/login">Se connecter</Link>
                <Link href="/forgot-password">Mot de passe oublié</Link>
                <Link href="/signup">Plan Pro — 14€/mois</Link>
              </div>
              <div className="lp-footer-col">
                <h4>Légal & Contact</h4>
                <Link href="/mentions-legales">Mentions légales</Link>
                <Link href="/confidentialite">Confidentialité</Link>
                <Link href="/confidentialite">Cookies</Link>
                <a href="mailto:hello@hublio.fr">hello@hublio.fr</a>
              </div>
            </div>
            <div className="lp-footer-bottom">
              <p>© {new Date().getFullYear()} {APP_CONFIG.name}. Tous droits réservés. Conçu et hébergé en France 🇫🇷</p>
              <p>
                <Link href="/mentions-legales">Mentions légales</Link>
                {" · "}
                <Link href="/confidentialite">Confidentialité</Link>
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
