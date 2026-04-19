"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { APP_CONFIG } from "@/config/app.config"

export default function LandingPage() {
  // Fade-up animation via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("lp-visible")
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    )
    document.querySelectorAll(".lp-fade-up").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .lp-root {
          font-family: var(--font-dm-sans, 'DM Sans', -apple-system, sans-serif);
          background: #FAFAF8;
          color: #1A1A1A;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        .lp-display {
          font-family: var(--font-instrument-serif, Georgia, serif);
        }
        .lp-container {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 24px;
        }
        /* NAV */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(250,250,248,0.88);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #F0EDE6;
        }
        .lp-nav-inner {
          display: flex; align-items: center; justify-content: space-between; height: 64px;
        }
        .lp-logo {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: 24px; color: #1A1A1A; text-decoration: none; letter-spacing: -0.5px;
        }
        .lp-logo span { color: #386FA4; }
        .lp-nav-links {
          display: flex; gap: 32px; align-items: center;
        }
        .lp-nav-links a {
          font-size: 14px; color: #6B6B6B; text-decoration: none; transition: color 0.2s;
        }
        .lp-nav-links a:hover { color: #1A1A1A; }
        .lp-nav-actions { display: flex; gap: 10px; align-items: center; }
        .lp-btn-ghost {
          font-size: 14px; font-family: var(--font-dm-sans, sans-serif);
          color: #6B6B6B; text-decoration: none; padding: 9px 18px;
          border-radius: 100px; transition: all 0.2s; border: 1px solid #E5E2DB;
          background: white;
        }
        .lp-btn-ghost:hover { color: #1A1A1A; border-color: #1A1A1A; }
        .lp-btn-primary {
          font-size: 14px; font-weight: 600; font-family: var(--font-dm-sans, sans-serif);
          color: white; text-decoration: none; padding: 9px 20px;
          border-radius: 100px; background: #386FA4; transition: all 0.2s;
        }
        .lp-btn-primary:hover { background: #2d5e8e; transform: translateY(-1px); }
        @media(max-width: 768px) {
          .lp-nav-links { display: none; }
        }

        /* HERO */
        .lp-hero {
          padding: 140px 0 80px; text-align: center;
        }
        .lp-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: #EBF4FB; color: #386FA4;
          padding: 6px 16px; border-radius: 100px; font-size: 13px; font-weight: 500; margin-bottom: 32px;
        }
        .lp-badge::before {
          content: ''; width: 6px; height: 6px; background: #386FA4; border-radius: 50%;
          animation: lp-pulse 2s infinite;
        }
        @keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .lp-h1 {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: clamp(40px, 6vw, 72px); line-height: 1.05;
          letter-spacing: -2px; max-width: 820px; margin: 0 auto 24px; font-weight: 400;
        }
        .lp-h1 em { color: #386FA4; font-style: italic; }
        .lp-hero-sub {
          font-size: 18px; color: #6B6B6B; max-width: 600px; margin: 0 auto 16px; line-height: 1.7;
        }
        .lp-tools {
          display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 40px;
        }
        .lp-tools span {
          font-size: 12px; padding: 4px 12px; border-radius: 100px;
          background: #F5F3EE; color: #6B6B6B; text-decoration: line-through; opacity: 0.7;
        }
        .lp-hero-cta {
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;
        }
        .lp-btn-hero {
          font-size: 15px; font-weight: 600; font-family: var(--font-dm-sans, sans-serif);
          color: white; text-decoration: none; padding: 14px 32px;
          border-radius: 100px; background: #386FA4; transition: all 0.2s; white-space: nowrap;
        }
        .lp-btn-hero:hover { background: #2d5e8e; transform: translateY(-1px); }
        .lp-btn-hero-outline {
          font-size: 15px; font-weight: 500; font-family: var(--font-dm-sans, sans-serif);
          color: #1A1A1A; text-decoration: none; padding: 13px 32px;
          border-radius: 100px; background: white; border: 1.5px solid #E5E2DB;
          transition: all 0.2s; white-space: nowrap;
        }
        .lp-btn-hero-outline:hover { border-color: #1A1A1A; }
        .lp-hero-note {
          text-align: center; margin-top: 16px; font-size: 13px; color: #999;
        }

        /* MOCK UI */
        .lp-hero-visual {
          margin: 60px auto 0; max-width: 940px;
          background: #0F1115; border-radius: 20px; padding: 28px;
          position: relative; overflow: hidden;
        }
        .lp-hero-visual::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(ellipse at 30% 20%, rgba(56,111,164,0.1) 0%, transparent 60%);
          pointer-events: none;
        }
        .mock-bar { display: flex; gap: 6px; margin-bottom: 16px; }
        .mock-dot { width: 10px; height: 10px; border-radius: 50%; }
        .mock-ui { display: grid; grid-template-columns: 190px 1fr; gap: 12px; min-height: 340px; }
        .mock-sidebar { background: #1A1D24; border-radius: 8px; padding: 14px; }
        .mock-main { background: #1A1D24; border-radius: 8px; padding: 18px; }
        .mock-kanban { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .mock-col-header { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #444; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
        .mock-col-count { background: #2A2D34; padding: 1px 6px; border-radius: 100px; font-size: 9px; color: #666; }
        .mock-card { background: #22252D; border-radius: 6px; padding: 9px; margin-bottom: 6px; border-left: 3px solid transparent; }
        .mock-card-title { font-size: 10.5px; color: #CCC; margin-bottom: 3px; }
        .mock-card-meta { font-size: 9px; color: #444; }
        .mock-card.done { border-left-color: #4ADE80; }
        .mock-card.progress { border-left-color: #386FA4; }
        .mock-card.review { border-left-color: #FBBF24; }
        .mock-card.todo { border-left-color: #555; }
        @media(max-width: 640px) {
          .mock-ui { grid-template-columns: 1fr; }
          .mock-sidebar { display: none; }
          .mock-kanban { grid-template-columns: repeat(2,1fr); }
          .lp-hero-visual { padding: 16px; margin-top: 40px; }
        }

        /* SECTION COMMON */
        .lp-section-label {
          font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
          color: #386FA4; font-weight: 600; margin-bottom: 12px;
        }
        .lp-section-title {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: clamp(32px, 4vw, 48px); line-height: 1.1;
          letter-spacing: -1px; margin-bottom: 16px; font-weight: 400;
        }
        .lp-section-subtitle {
          font-size: 17px; color: #6B6B6B; max-width: 560px; line-height: 1.6;
        }

        /* BEFORE / AFTER */
        .lp-before-after { padding: 100px 0; }
        .lp-ba-grid {
          display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px;
          align-items: stretch; margin-top: 48px;
        }
        .lp-ba-card { border-radius: 16px; padding: 32px; }
        .lp-ba-before { background: white; border: 1px solid #E5E2DB; }
        .lp-ba-after { background: #0F1115; color: white; }
        .lp-ba-arrow { display: flex; align-items: center; justify-content: center; font-size: 32px; color: #386FA4; }
        .lp-ba-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .lp-ba-before .lp-ba-title { color: #6B6B6B; }
        .lp-ba-after .lp-ba-title { color: #386FA4; }
        .lp-ba-item { padding: 10px 0; border-bottom: 1px solid rgba(128,128,128,0.15); font-size: 14px; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }
        .lp-ba-item:last-child { border-bottom: none; }
        .lp-ba-before .lp-ba-item { color: #6B6B6B; }
        .lp-ba-after .lp-ba-item { color: #CCC; }
        .lp-ba-icon { flex-shrink: 0; width: 20px; text-align: center; font-size: 14px; margin-top: 2px; }
        @media(max-width: 768px) {
          .lp-ba-grid { grid-template-columns: 1fr; }
          .lp-ba-arrow { transform: rotate(90deg); padding: 8px 0; }
        }

        /* FEATURES */
        .lp-features { padding: 100px 0; }
        .lp-features-header { text-align: center; margin-bottom: 64px; }
        .lp-features-megagrid { display: flex; flex-direction: column; gap: 16px; }
        .lp-feature-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
        .lp-feature-card {
          background: white; border: 1px solid #F0EDE6; border-radius: 16px;
          padding: 28px; transition: all 0.3s; position: relative; overflow: hidden;
        }
        .lp-feature-card:hover { border-color: #E5E2DB; transform: translateY(-2px); }
        .lp-feature-card.highlight { border: 1.5px solid #386FA4; }
        .lp-feature-card.highlight::after {
          content: 'Cœur du produit'; position: absolute; top: 12px; right: 12px;
          font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 100px;
          background: #EBF4FB; color: #386FA4;
        }
        .lp-feature-icon-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .lp-feature-emoji { font-size: 28px; line-height: 1; }
        .lp-feature-card h3 { font-size: 17px; font-weight: 600; margin-bottom: 6px; color: #1A1A1A; }
        .lp-feature-card p { font-size: 13.5px; color: #6B6B6B; line-height: 1.65; }
        .lp-feature-bullets { list-style: none; margin-top: 10px; padding: 0; }
        .lp-feature-bullets li {
          font-size: 12.5px; color: #6B6B6B; padding: 3px 0; padding-left: 18px; position: relative;
        }
        .lp-feature-bullets li::before {
          content: ''; position: absolute; left: 0; top: 10px;
          width: 6px; height: 6px; border-radius: 50%; background: #E5E2DB;
        }

        /* JOURNEY / ROADMAP */
        .lp-journey { padding: 100px 0; background: #0F1115; color: white; }
        .lp-journey .lp-section-subtitle { color: #777; }
        .lp-journey-timeline { margin-top: 56px; position: relative; }
        .lp-journey-timeline::before {
          content: ''; position: absolute; left: 32px; top: 0; bottom: 0;
          width: 2px; background: linear-gradient(to bottom, #386FA4, #333);
        }
        .lp-journey-item { display: flex; gap: 24px; margin-bottom: 40px; position: relative; }
        .lp-journey-item:last-child { margin-bottom: 0; }
        .lp-journey-dot {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; flex-shrink: 0;
          position: relative; z-index: 2;
        }
        .lp-dot-active { background: #386FA4; color: white; box-shadow: 0 0 0 6px rgba(56,111,164,0.2); }
        .lp-dot-next { background: #1A1D24; border: 2px solid #333; color: #555; }
        .lp-journey-content { padding-top: 8px; flex: 1; }
        .lp-journey-content h3 { font-size: 20px; font-weight: 600; margin-bottom: 4px; color: white; }
        .lp-j-version { font-size: 12px; color: #386FA4; font-weight: 600; margin-bottom: 6px; display: inline-block; }
        .lp-journey-content p { font-size: 14px; color: #888; line-height: 1.7; max-width: 520px; }
        .lp-j-features { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .lp-j-tag {
          font-size: 11px; padding: 3px 10px; border-radius: 100px;
          background: #1A1D24; border: 1px solid #2A2D34; color: #888;
        }
        @media(max-width: 768px) {
          .lp-journey-timeline::before { left: 20px; }
          .lp-journey-dot { width: 40px; height: 40px; font-size: 12px; }
        }

        /* HOW IT WORKS */
        .lp-how { padding: 100px 0; }
        .lp-how-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; margin-top: 48px; }
        .lp-how-number {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: 56px; color: #E5E2DB; line-height: 1; margin-bottom: 12px;
        }
        .lp-how-step h3 { font-size: 17px; font-weight: 600; margin-bottom: 6px; color: #1A1A1A; }
        .lp-how-step p { font-size: 14px; color: #6B6B6B; line-height: 1.6; }

        /* GAINS */
        .lp-gains { padding: 80px 0 100px; }
        .lp-gains-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-top: 48px; }
        .lp-gain-card {
          background: white; border: 1px solid #F0EDE6; border-radius: 16px;
          padding: 28px 20px; text-align: center;
        }
        .lp-gain-number {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: 48px; color: #386FA4; line-height: 1; margin-bottom: 6px;
        }
        .lp-gain-label { font-size: 13px; color: #6B6B6B; line-height: 1.4; }

        /* AUDIENCE */
        .lp-audience { padding: 80px 0; background: #F5F3EE; }
        .lp-audience-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
          margin-top: 40px; max-width: 840px; margin-left: auto; margin-right: auto;
        }
        .lp-audience-card { background: white; border-radius: 16px; padding: 24px; text-align: center; }
        .lp-audience-emoji { font-size: 36px; margin-bottom: 12px; }
        .lp-audience-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; color: #1A1A1A; }
        .lp-audience-card p { font-size: 13px; color: #6B6B6B; }
        @media(max-width: 640px) {
          .lp-audience-grid { grid-template-columns: 1fr; max-width: 320px; }
        }

        /* SOVEREIGNTY */
        .lp-sovereignty { padding: 80px 0; }
        .lp-sov-box { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
        .lp-sov-visual {
          background: #0F1115; border-radius: 16px; padding: 40px; text-align: center;
          position: relative; overflow: hidden;
        }
        .lp-sov-visual::before {
          content: ''; position: absolute; top: -30%; right: -30%;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-sov-flag { font-size: 64px; margin-bottom: 16px; position: relative; }
        .lp-sov-visual h3 { font-size: 20px; font-weight: 600; color: white; margin-bottom: 8px; position: relative; }
        .lp-sov-visual p { font-size: 13px; color: #666; position: relative; }
        .lp-sov-text h3 { font-size: 24px; font-weight: 600; margin-bottom: 12px; color: #1A1A1A; }
        .lp-sov-text > p { font-size: 15px; color: #6B6B6B; line-height: 1.7; margin-bottom: 16px; }
        .lp-sov-points { list-style: none; padding: 0; }
        .lp-sov-points li { font-size: 14px; padding: 8px 0; display: flex; align-items: flex-start; gap: 10px; color: #1A1A1A; }
        .lp-sov-points li span { color: #2563EB; font-weight: 600; flex-shrink: 0; }
        @media(max-width: 768px) { .lp-sov-box { grid-template-columns: 1fr; } }

        /* PRICING */
        .lp-pricing { padding: 80px 0; background: #F5F3EE; }
        .lp-pricing-cards {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;
          margin-top: 40px; max-width: 700px; margin-left: auto; margin-right: auto;
        }
        .lp-pricing-card { background: white; border: 1px solid #F0EDE6; border-radius: 16px; padding: 32px; text-align: center; }
        .lp-pricing-card.featured { border: 2px solid #386FA4; position: relative; }
        .lp-pricing-card.featured::before {
          content: 'Le plus populaire'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          font-size: 11px; font-weight: 600; padding: 4px 14px; border-radius: 100px;
          background: #386FA4; color: white; white-space: nowrap;
        }
        .lp-pricing-card h3 { font-size: 20px; font-weight: 600; margin-bottom: 4px; color: #1A1A1A; }
        .lp-pricing-price {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: 40px; color: #1A1A1A; margin: 12px 0 4px;
        }
        .lp-pricing-price span { font-size: 16px; color: #6B6B6B; font-family: var(--font-dm-sans, sans-serif); }
        .lp-pricing-desc { font-size: 13px; color: #6B6B6B; margin-bottom: 20px; }
        .lp-pricing-list { list-style: none; text-align: left; padding: 0; margin-bottom: 24px; }
        .lp-pricing-list li { font-size: 13px; padding: 5px 0; display: flex; align-items: flex-start; gap: 8px; color: #6B6B6B; }
        .lp-pricing-list li::before { content: '✓'; color: #2D8A56; font-weight: 600; flex-shrink: 0; }
        .lp-pricing-cta {
          display: block; text-align: center; text-decoration: none; font-weight: 600;
          font-family: var(--font-dm-sans, sans-serif); padding: 12px 24px; border-radius: 100px;
          font-size: 14px; transition: all 0.2s;
        }
        .lp-pricing-cta-outline { border: 1.5px solid #E5E2DB; color: #1A1A1A; }
        .lp-pricing-cta-outline:hover { border-color: #1A1A1A; }
        .lp-pricing-cta-primary { background: #386FA4; color: white; }
        .lp-pricing-cta-primary:hover { background: #2d5e8e; transform: translateY(-1px); }

        /* CTA SECTION */
        .lp-cta-section { padding: 100px 0; text-align: center; }
        .lp-cta-box {
          background: #0F1115; border-radius: 24px; padding: 64px 40px;
          position: relative; overflow: hidden;
        }
        .lp-cta-box::before {
          content: ''; position: absolute; bottom: -40%; right: -20%;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(56,111,164,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-cta-box h2 {
          font-family: var(--font-instrument-serif, Georgia, serif);
          font-size: clamp(32px, 4vw, 48px); color: white; margin-bottom: 16px;
          font-weight: 400; letter-spacing: -1px; position: relative;
        }
        .lp-cta-box p { color: #888; font-size: 16px; margin-bottom: 32px; max-width: 480px; margin-left: auto; margin-right: auto; position: relative; }
        .lp-cta-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; margin-bottom: 24px; }
        .lp-btn-cta-primary {
          font-size: 15px; font-weight: 600; font-family: var(--font-dm-sans, sans-serif);
          color: white; text-decoration: none; padding: 14px 32px;
          border-radius: 100px; background: #386FA4; transition: all 0.2s; white-space: nowrap;
        }
        .lp-btn-cta-primary:hover { background: #2d5e8e; transform: translateY(-1px); }
        .lp-btn-cta-outline {
          font-size: 15px; font-weight: 500; font-family: var(--font-dm-sans, sans-serif);
          color: white; text-decoration: none; padding: 13px 32px;
          border-radius: 100px; background: transparent; border: 1.5px solid #333;
          transition: all 0.2s; white-space: nowrap;
        }
        .lp-btn-cta-outline:hover { border-color: #666; }
        .lp-cta-perks { display: flex; justify-content: center; gap: 24px; position: relative; }
        .lp-cta-perks span { font-size: 12px; color: #555; display: flex; align-items: center; gap: 6px; }
        .lp-cta-perks .check { color: #386FA4; }
        @media(max-width: 768px) {
          .lp-cta-box { padding: 40px 24px; }
          .lp-cta-perks { flex-direction: column; align-items: center; gap: 8px; }
        }

        /* FOOTER */
        .lp-footer { padding: 40px 0; border-top: 1px solid #F0EDE6; text-align: center; }
        .lp-footer p { font-size: 13px; color: #999; }
        .lp-footer a { color: #6B6B6B; text-decoration: none; }
        .lp-footer a:hover { color: #1A1A1A; }

        /* ANIMATIONS */
        .lp-fade-up { opacity: 0; transform: translateY(24px); transition: all 0.6s cubic-bezier(0.16,1,0.3,1); }
        .lp-visible { opacity: 1; transform: translateY(0); }

        /* RESPONSIVE */
        @media(max-width: 768px) {
          .lp-before-after, .lp-features, .lp-gains, .lp-cta-section, .lp-how, .lp-audience { padding: 64px 0; }
          .lp-journey { padding: 64px 0; }
          .lp-hero { padding: 120px 0 60px; }
        }
      `}</style>

      <div className="lp-root">
        {/* NAV */}
        <nav className="lp-nav">
          <div className="lp-container lp-nav-inner">
            <a href="/" className="lp-logo">Client<span>Flow</span></a>
            <div className="lp-nav-links">
              <a href="#features">Fonctionnalités</a>
              <a href="#roadmap">Roadmap</a>
              <a href="#pricing">Tarifs</a>
              <a href="#gains">Avantages</a>
            </div>
            <div className="lp-nav-actions">
              <Link href="/login" className="lp-btn-ghost">Se connecter</Link>
              <Link href="/signup" className="lp-btn-primary">Commencer gratuitement</Link>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-container">
            <div className="lp-badge">Lancement — Bêta ouverte</div>
            <h1 className="lp-h1">Un seul espace pour gérer vos projets clients <em>de A à Z</em></h1>
            <p className="lp-hero-sub">
              Onboarding, suivi de projet, validations, rendez-vous, facturation — arrêtez de jongler entre 6 outils. Vos clients méritent un portail pro. Vous méritez de gagner du temps.
            </p>
            <div className="lp-tools">
              <span>Google Drive</span>
              <span>WeTransfer</span>
              <span>Notion</span>
              <span>Excel</span>
              <span>Calendly</span>
              <span>Gmail</span>
            </div>
            <div className="lp-hero-cta">
              <Link href="/signup" className="lp-btn-hero">Créer mon compte gratuit</Link>
              <Link href="/login" className="lp-btn-hero-outline">Se connecter</Link>
            </div>
            <p className="lp-hero-note">Gratuit pour démarrer · Aucune carte bancaire requise</p>

            {/* Mock UI */}
            <div className="lp-hero-visual lp-fade-up">
              <div className="mock-bar">
                <div className="mock-dot" style={{ background: "#FF5F57" }}></div>
                <div className="mock-dot" style={{ background: "#FEBC2E" }}></div>
                <div className="mock-dot" style={{ background: "#28C840" }}></div>
              </div>
              <div className="mock-ui">
                <div className="mock-sidebar">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 14px", borderBottom: "1px solid #2A2D34", marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: "#386FA4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>S</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#DDD" }}>Studio Martin</div>
                      <div style={{ fontSize: 9, color: "#555" }}>Plan Pro</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#444", padding: "2px 10px 6px" }}>Navigation</div>
                  {[
                    { label: "Dashboard", bg: "#2A4A3A", active: false },
                    { label: "Clients", bg: "#2A3A4A", active: false, count: "12" },
                    { label: "Projets", bg: "#2A2D34", active: true, count: "5" },
                    { label: "Documents", bg: "#3A2A4A", active: false },
                    { label: "Calendrier", bg: "#4A3A2A", active: false },
                  ].map((item) => (
                    <div key={item.label} style={{ padding: "7px 10px", borderRadius: 6, fontSize: 11.5, color: item.active ? "#386FA4" : "#555", marginBottom: 3, display: "flex", alignItems: "center", gap: 8, background: item.active ? "rgba(56,111,164,0.12)" : "transparent" }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: item.active ? "rgba(56,111,164,0.3)" : item.bg, flexShrink: 0 }}></div>
                      {item.label}
                      {item.count && <span style={{ marginLeft: "auto", fontSize: 9, background: item.active ? "rgba(56,111,164,0.2)" : "#2A2D34", padding: "1px 6px", borderRadius: 100, color: item.active ? "#386FA4" : "#666" }}>{item.count}</span>}
                    </div>
                  ))}
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: "#444", padding: "10px 10px 6px", borderTop: "1px solid #2A2D34", marginTop: 8 }}>Projet actif</div>
                  {["Kanban", "Fichiers", "Validations", "Messages"].map((label) => (
                    <div key={label} style={{ padding: "7px 10px", borderRadius: 6, fontSize: 11.5, color: "#666", marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, background: "#2A2D34", flexShrink: 0 }}></div>
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mock-main">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>Projet client</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#EEE" }}>Refonte site — Studio Berger</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 100, background: "rgba(45,138,86,0.15)", color: "#4ADE80" }}>En cours</span>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 100, background: "#2A2D34", color: "#777" }}>Deadline : 15 avril</span>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 100, background: "#2A2D34", color: "#777" }}>Budget : 4 500€</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>72%</div>
                      <div style={{ fontSize: 9, color: "#555" }}>complété</div>
                    </div>
                  </div>
                  <div style={{ background: "#2A2D34", borderRadius: 100, height: 4, marginBottom: 16, overflow: "hidden" }}>
                    <div style={{ background: "linear-gradient(90deg,#4ADE80,#386FA4)", width: "72%", height: "100%", borderRadius: 100 }}></div>
                  </div>
                  <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "1px solid #2A2D34" }}>
                    {["Kanban", "Liste", "Fichiers 14", "Messages 2"].map((tab, i) => (
                      <div key={tab} style={{ padding: "6px 14px", fontSize: 11, color: i === 0 ? "#386FA4" : "#555", borderBottom: i === 0 ? "2px solid #386FA4" : "none", marginBottom: i === 0 ? -1 : 0 }}>{tab}</div>
                    ))}
                  </div>
                  <div className="mock-kanban">
                    <div>
                      <div className="mock-col-header"><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block" }}></span> Terminé <span className="mock-col-count">3</span></div>
                      <div className="mock-card done"><div className="mock-card-title">Onboarding client</div><div className="mock-card-meta">15 mars ✓</div></div>
                      <div className="mock-card done"><div className="mock-card-title">Brief validé</div><div className="mock-card-meta">18 mars ✓</div></div>
                      <div className="mock-card done"><div className="mock-card-title">Charte graphique</div><div className="mock-card-meta">22 mars ✓</div></div>
                    </div>
                    <div>
                      <div className="mock-col-header"><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#386FA4", display: "inline-block" }}></span> En cours <span className="mock-col-count">2</span></div>
                      <div className="mock-card progress"><div className="mock-card-title">Intégration home</div><div className="mock-card-meta">En cours · J-3</div></div>
                      <div className="mock-card progress"><div className="mock-card-title">Section services</div><div className="mock-card-meta">En cours</div></div>
                    </div>
                    <div>
                      <div className="mock-col-header"><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FBBF24", display: "inline-block" }}></span> En validation <span className="mock-col-count">1</span></div>
                      <div className="mock-card review"><div className="mock-card-title">Maquette mobile</div><div className="mock-card-meta">En attente client</div></div>
                    </div>
                    <div>
                      <div className="mock-col-header"><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#555", display: "inline-block" }}></span> À faire <span className="mock-col-count">4</span></div>
                      <div className="mock-card todo"><div className="mock-card-title">Page contact</div><div className="mock-card-meta">Planifié</div></div>
                      <div className="mock-card todo"><div className="mock-card-title">SEO & meta</div><div className="mock-card-meta">Planifié</div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BEFORE / AFTER */}
        <section className="lp-before-after" id="features">
          <div className="lp-container">
            <div style={{ textAlign: "center" }}>
              <div className="lp-section-label">Avant / Après</div>
              <div className="lp-section-title">Fini le chaos d'outils</div>
              <p className="lp-section-subtitle" style={{ margin: "0 auto" }}>Comparez votre quotidien actuel avec ce que {APP_CONFIG.name} vous apporte.</p>
            </div>
            <div className="lp-ba-grid">
              <div className="lp-ba-card lp-ba-before lp-fade-up">
                <div className="lp-ba-title">😰 Avant</div>
                {[
                  { icon: "📧", text: "Onboarding par email : vous relancez, perdez des fichiers, reformattez des infos" },
                  { icon: "📊", text: "Suivi projet sur un Google Sheet que personne ne lit vraiment" },
                  { icon: "📁", text: "Fichiers éparpillés : WeTransfer, Drive, Dropbox, email… impossible à retrouver" },
                  { icon: "📅", text: "Allers-retours pour caler une réunion, liens Meet à générer à la main" },
                  { icon: "🧾", text: "Devis et factures en PDF envoyés par email, statuts jamais à jour" },
                  { icon: "😤", text: "Le client vous relance pour avoir des nouvelles — vous perdez 30 min à répondre" },
                ].map((item, i) => (
                  <div key={i} className="lp-ba-item">
                    <span className="lp-ba-icon">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
              <div className="lp-ba-arrow">→</div>
              <div className="lp-ba-card lp-ba-after lp-fade-up">
                <div className="lp-ba-title">✨ Avec {APP_CONFIG.name}</div>
                {[
                  { icon: "✅", text: "Formulaire d'onboarding sur mesure envoyé en 2 clics — tout est centralisé automatiquement" },
                  { icon: "📋", text: "Kanban projet en temps réel, visible par le client dans son portail dédié" },
                  { icon: "🗂️", text: "Tous les fichiers au même endroit : upload, download, ZIP groupé" },
                  { icon: "📆", text: "Réservation de créneau intégrée, Google Meet créé automatiquement (v3)" },
                  { icon: "📑", text: "Espace devis & factures dans le portail client — statuts mis à jour en temps réel (v2)" },
                  { icon: "👤", text: "Le client voit l'avancement en direct, valide les étapes — zéro email de relance" },
                ].map((item, i) => (
                  <div key={i} className="lp-ba-item">
                    <span className="lp-ba-icon">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="lp-features">
          <div className="lp-container">
            <div className="lp-features-header">
              <div className="lp-section-label">Fonctionnalités</div>
              <div className="lp-section-title">Tout ce dont vous avez besoin</div>
              <p className="lp-section-subtitle">De l'onboarding à la livraison, chaque étape du projet est couverte.</p>
            </div>
            <div className="lp-features-megagrid">
              <div className="lp-feature-row">
                <div className="lp-feature-card highlight lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">🎯</span></div>
                  <h3>Onboarding client automatisé</h3>
                  <p>Créez des formulaires d'onboarding sur mesure avec 9 types de champs. Envoyez un lien — votre client remplit tout sans compte.</p>
                  <ul className="lp-feature-bullets">
                    <li>Sections et champs réorganisables</li>
                    <li>Sauvegarde auto de la progression</li>
                    <li>Notification email dès la soumission</li>
                  </ul>
                </div>
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">🗂️</span></div>
                  <h3>Kanban de suivi de projet</h3>
                  <p>Un tableau kanban personnalisable pour chaque projet. Colonnes sur mesure, drag & drop, filtres, et vue liste alternative.</p>
                  <ul className="lp-feature-bullets">
                    <li>Tâches visibles ou masquées côté client</li>
                    <li>Priorités, deadlines, assignation</li>
                    <li>Colonnes personnalisables</li>
                  </ul>
                </div>
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">👤</span></div>
                  <h3>Portail client dédié</h3>
                  <p>Chaque client dispose d'un espace personnel pour suivre ses projets, voir les étapes, et télécharger ses fichiers.</p>
                  <ul className="lp-feature-bullets">
                    <li>Branding personnalisé (v2)</li>
                    <li>Avancement en temps réel</li>
                    <li>Notifications automatiques</li>
                  </ul>
                </div>
              </div>
              <div className="lp-feature-row">
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">✅</span></div>
                  <h3>Validation d'étapes (v2)</h3>
                  <p>Soumettez des livrables à la validation client directement dans le portail. Commentaires, approbation ou demande de modification.</p>
                  <ul className="lp-feature-bullets">
                    <li>Workflow de validation intégré</li>
                    <li>Historique des révisions</li>
                    <li>Notification email au client</li>
                  </ul>
                </div>
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">💬</span></div>
                  <h3>Messagerie projet (v2)</h3>
                  <p>Un chat dédié par projet, avec distinction messages internes et messages client. Plus d'emails perdus.</p>
                  <ul className="lp-feature-bullets">
                    <li>Messages internes vs client</li>
                    <li>Notifications en temps réel</li>
                    <li>Historique complet</li>
                  </ul>
                </div>
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">📑</span></div>
                  <h3>Espace devis et factures (v2)</h3>
                  <p>Stockez et partagez vos devis et factures PDF dans un espace dédié. Le client les retrouve dans son portail avec les statuts à jour.</p>
                  <ul className="lp-feature-bullets">
                    <li>Upload PDF sécurisé</li>
                    <li>Statuts (en attente, signé, payé)</li>
                    <li>Visible dans le portail client</li>
                  </ul>
                </div>
              </div>
              <div className="lp-feature-row">
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">📅</span></div>
                  <h3>Google Calendar & Meet (v3)</h3>
                  <p>Connectez votre agenda Google pour proposer des créneaux de réunion. Les liens Meet sont générés automatiquement.</p>
                  <ul className="lp-feature-bullets">
                    <li>Réservation de créneaux côté client</li>
                    <li>Google Meet auto-créé</li>
                    <li>Comptes rendus et points d'action</li>
                  </ul>
                </div>
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">📋</span></div>
                  <h3>Templates métier</h3>
                  <p>Démarrez vite avec des templates pré-configurés pour les projets web, design, marketing et conseil. Personnalisables à volonté.</p>
                  <ul className="lp-feature-bullets">
                    <li>Formulaire + kanban pré-remplis</li>
                    <li>Sauvegardez vos propres templates</li>
                    <li>Réutilisez sur tous vos projets</li>
                  </ul>
                </div>
                <div className="lp-feature-card lp-fade-up">
                  <div className="lp-feature-icon-row"><span className="lp-feature-emoji">📁</span></div>
                  <h3>Gestion de fichiers centralisée</h3>
                  <p>Tous les documents du projet au même endroit : fichiers de l'onboarding, livrables, factures. Upload, téléchargement, ZIP groupé.</p>
                  <ul className="lp-feature-bullets">
                    <li>Stockage sécurisé en France (RGPD)</li>
                    <li>Jusqu'à 200 Mo par fichier</li>
                    <li>Téléchargement groupé en ZIP</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="lp-journey" id="roadmap">
          <div className="lp-container">
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div className="lp-section-label">Roadmap</div>
              <div className="lp-section-title" style={{ color: "white" }}>Construit en public,<br />étape par étape</div>
              <p className="lp-section-subtitle" style={{ margin: "0 auto" }}>On ne vous promet pas tout d'un coup. On construit feature par feature, guidé par vos retours.</p>
            </div>
            <div className="lp-journey-timeline">
              {[
                {
                  version: "V1", label: "Lancement — Été 2026", title: "Les fondations", active: true,
                  desc: "L'essentiel pour remplacer votre chaos d'outils : collectez les infos client, suivez vos projets, offrez un portail professionnel à chaque client.",
                  tags: ["Onboarding client", "Kanban projet", "Portail client", "Templates métier", "Upload fichiers", "Gestion clients"],
                },
                {
                  version: "V2", label: "Automne 2026", title: "Collaboration et business", active: true,
                  desc: "Le projet avance, le client participe. Validations, messagerie intégrée, et un espace centralisé pour vos devis et factures.",
                  tags: ["Validation d'étapes", "Espace devis / factures", "Messagerie projet", "Suivi statuts documents"],
                },
                {
                  version: "V3", label: "Hiver 2026/2027", title: "Google Workspace et réunions", active: false,
                  desc: "Connectez votre Google Calendar, proposez des créneaux, générez des liens Meet automatiquement, et publiez vos comptes rendus en un clic.",
                  tags: ["Google Calendar sync", "Google Meet auto", "Prise de RDV", "Comptes rendus", "Calendrier intégré"],
                },
                {
                  version: "V4", label: "2027", title: "Scale et intégrations", active: false,
                  desc: "Pour les agences qui grandissent : marque blanche, multi-utilisateurs, paiement en ligne, intégrations Zapier/Make, et API publique.",
                  tags: ["Marque blanche", "Multi-utilisateurs", "Paiement Stripe", "Zapier / Make", "API publique", "Relances auto"],
                },
              ].map((item) => (
                <div key={item.version} className="lp-journey-item lp-fade-up">
                  <div className={`lp-journey-dot ${item.active ? "lp-dot-active" : "lp-dot-next"}`}>{item.version}</div>
                  <div className="lp-journey-content">
                    <span className="lp-j-version">{item.label}</span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div className="lp-j-features">
                      {item.tags.map((tag) => <span key={tag} className="lp-j-tag">{tag}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lp-how">
          <div className="lp-container">
            <div style={{ textAlign: "center" }}>
              <div className="lp-section-label">En pratique</div>
              <div className="lp-section-title">3 minutes pour onboarder un client</div>
              <p className="lp-section-subtitle" style={{ margin: "0 auto" }}>Pas de formation, pas de config complexe. Créez, envoyez, gérez.</p>
            </div>
            <div className="lp-how-steps">
              {[
                { n: "1", title: "Créez votre projet", desc: "Nommez le projet, ajoutez votre client, choisissez un template métier ou créez votre formulaire d'onboarding sur-mesure." },
                { n: "2", title: "Envoyez le lien", desc: "Votre client reçoit un lien vers son portail personnalisé. Il remplit le brief et uploade ses fichiers — sans créer de compte." },
                { n: "3", title: "Le client crée son accès", desc: "À la soumission, le client est invité à créer son compte. Il accède à son espace dédié : avancement, validations, fichiers." },
                { n: "4", title: "Gérez et livrez", desc: "Avancez sur le kanban, soumettez des étapes à validation, planifiez des réunions. Le client voit tout, valide tout." },
              ].map((step) => (
                <div key={step.n} className="lp-how-step lp-fade-up">
                  <div className="lp-how-number">{step.n}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GAINS */}
        <section className="lp-gains" id="gains">
          <div className="lp-container">
            <div style={{ textAlign: "center" }}>
              <div className="lp-section-label">Impact</div>
              <div className="lp-section-title">Le temps que vous allez récupérer</div>
              <p className="lp-section-subtitle" style={{ margin: "0 auto" }}>Des heures gagnées chaque semaine, un suivi impeccable, et des clients qui vous recommandent.</p>
            </div>
            <div className="lp-gains-grid">
              {[
                { n: "5h", label: "économisées par projet sur l'onboarding" },
                { n: "0", label: 'email \u201cvous pouvez m\u2019envoyer\u2026\u201d' },
                { n: "100%", label: "de visibilité client sur le projet" },
                { n: "1", label: "seul endroit pour tous les documents du projet" },
                { n: "1 clic", label: "pour planifier un rendez-vous Meet" },
                { n: "Pro", label: "l'image renvoyée dès le premier contact" },
              ].map((item) => (
                <div key={item.n} className="lp-gain-card lp-fade-up">
                  <div className="lp-gain-number">{item.n}</div>
                  <div className="lp-gain-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="lp-audience">
          <div className="lp-container">
            <div style={{ textAlign: "center" }}>
              <div className="lp-section-label">Pour qui</div>
              <div className="lp-section-title">Pensé pour ceux qui vivent du projet client</div>
            </div>
            <div className="lp-audience-grid">
              {[
                { emoji: "💻", title: "Développeurs web freelance", desc: "Collectez les briefs, gérez les sprints, livrez proprement." },
                { emoji: "📱", title: "Community managers", desc: "Récupérez les accès et visuels, validez les plannings éditoriaux." },
                { emoji: "🎨", title: "Designers et graphistes", desc: "Partagez les maquettes, gérez les aller-retours de validation." },
                { emoji: "📣", title: "Agences marketing", desc: "Multi-projets, multi-clients, facturation — tout centralisé." },
                { emoji: "📊", title: "Consultants", desc: "Comptes rendus, validation de livrables, suivi transparent." },
                { emoji: "🏗️", title: "Et tous les métiers de service", desc: "Si vous travaillez en mode projet pour des clients, c'est pour vous." },
              ].map((item) => (
                <div key={item.title} className="lp-audience-card lp-fade-up">
                  <div className="lp-audience-emoji">{item.emoji}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOVEREIGNTY */}
        <section className="lp-sovereignty">
          <div className="lp-container">
            <div className="lp-sov-box lp-fade-up">
              <div className="lp-sov-visual">
                <div className="lp-sov-flag">🇫🇷</div>
                <h3>Hébergé en France</h3>
                <p>Stockage 100% français</p>
                <p>Données chiffrées de bout en bout</p>
              </div>
              <div className="lp-sov-text">
                <div className="lp-section-label">Souveraineté numérique</div>
                <h3>Vos données et celles de vos clients restent en France</h3>
                <p>Dans un monde où les données traversent les océans, nous faisons un choix clair : tout est stocké en France, sur des serveurs français. Pas de transfert hors UE, pas de zone grise juridique.</p>
                <ul className="lp-sov-points">
                  {[
                    "100% des fichiers stockés en France (datacenter Paris)",
                    "Base de données hébergée en France (Paris)",
                    "Toutes les données sont chiffrées (AES-256)",
                    "Conformité RGPD native, intégrée dès la conception",
                    "Aucun tracking tiers sur le portail de vos clients",
                    "Droit de suppression total : vos données, votre contrôle",
                  ].map((point) => (
                    <li key={point}><span>→</span> {point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="lp-pricing" id="pricing">
          <div className="lp-container">
            <div style={{ textAlign: "center" }}>
              <div className="lp-section-label">Tarifs</div>
              <div className="lp-section-title">Gratuit pour démarrer.<br />Flexible pour grandir.</div>
              <p className="lp-section-subtitle" style={{ margin: "0 auto" }}>Commencez sans sortir la carte bleue. Passez au plan payant quand vous avez besoin de plus de puissance.</p>
            </div>
            <div className="lp-pricing-cards">
              <div className="lp-pricing-card lp-fade-up">
                <h3>Gratuit</h3>
                <div className="lp-pricing-price">0€</div>
                <div className="lp-pricing-desc">Pour tester et gérer vos premiers projets</div>
                <ul className="lp-pricing-list">
                  {["3 projets actifs", "Onboarding client + formulaires", "Kanban de suivi", "Portail client basique", "500 Mo de stockage", "Templates métier inclus"].map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href="/signup" className="lp-pricing-cta lp-pricing-cta-outline">Commencer gratuitement</Link>
              </div>
              <div className="lp-pricing-card featured lp-fade-up">
                <h3>Pro</h3>
                <div className="lp-pricing-price">
                  <span style={{ textDecoration: "line-through", color: "#999", fontSize: 22, fontFamily: "var(--font-instrument-serif, Georgia, serif)" }}>19€</span> 9€<span>/mois</span>
                </div>
                <div className="lp-pricing-desc" style={{ color: "#386FA4", fontWeight: 500 }}>Tarif bêta-testeur garanti à vie</div>
                <ul className="lp-pricing-list">
                  {["Projets illimités", "Validations d'étapes (v2)", "Messagerie projet (v2)", "Espace devis et factures (v2)", "15 Go de stockage", "Portail client complet et brandé", "Notifications email", "Suppression du branding"].map((f) => <li key={f}>{f}</li>)}
                </ul>
                <Link href="/signup" className="lp-pricing-cta lp-pricing-cta-primary">Démarrer l'essai gratuit</Link>
              </div>
            </div>
            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#999" }}>Le tarif bêta-testeur à 9€/mois est garanti à vie pour les premiers inscrits.</p>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta-section">
          <div className="lp-container">
            <div className="lp-cta-box lp-fade-up">
              <h2>Soyez parmi les premiers à l'utiliser</h2>
              <p>Accès gratuit + tarif fondateur à vie pour les premiers inscrits. On construit ce produit avec vous.</p>
              <div className="lp-cta-buttons">
                <Link href="/signup" className="lp-btn-cta-primary">Créer mon compte gratuit</Link>
                <Link href="/login" className="lp-btn-cta-outline">J'ai déjà un compte</Link>
              </div>
              <div className="lp-cta-perks">
                <span><span className="check">✓</span> Accès gratuit immédiat</span>
                <span><span className="check">✓</span> Tarif fondateur garanti</span>
                <span><span className="check">✓</span> Vos retours façonnent le produit</span>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-container">
            <p style={{ marginBottom: 8 }}>
              <strong>{APP_CONFIG.name}</strong> — Conçu en France pour les freelances et agences qui veulent travailler mieux.
            </p>
            <p style={{ marginBottom: 12 }}>
              100% des données hébergées en France · Souveraineté numérique garantie · Conforme RGPD
            </p>
            <p>
              <Link href="/mentions-legales">Mentions légales</Link>
              {" · "}
              <Link href="/confidentialite">Politique de confidentialité</Link>
              {" · "}
              <Link href="/login">Connexion</Link>
              {" · "}
              <Link href="/signup">Inscription</Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
