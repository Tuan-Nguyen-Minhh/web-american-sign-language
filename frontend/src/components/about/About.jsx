import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaLanguage,
  FaCog,
  FaBook,
  FaWifi,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import "./about.css";

// Import your images
import mapImage1 from "../../assets/world-map-deaf.png";
import mapImage2 from "../../assets/Refresh_ASL.png";

export default function About() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeSection, setActiveSection] = useState("real-time");
  const [openFaq, setOpenFaq] = useState(null);

  const slides = [
    {
      id: 1,
      image: mapImage2,
      description: "There are over",
      highlight: "1.5 billion",
      continuation:
        "people affected by hearing loss worldwide. Of them, nearly 1 out of 3 need hearing care, and 80% live in low- and middle-income countries.",
    },
    {
      id: 2,
      image: mapImage1,
      title: "The Diversity of Sign Language",
      description: "Sign language is not universal. Globally, there are over",
      highlight: "300 distinct",
      continuation:
        "sign languages currently in use. This linguistic diversity creates a massive need for localized AI translation tools to bridge the gap between different deaf communities and the hearing world.",
    },
    {
      id: 3,
      image:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop",
      title: "A Growing Necessity",
      description:
        "The need for accessibility is rising. By 2050, the WHO projects",
      highlight: "2.5 billion",
      continuation:
        "people will be living with some degree of hearing loss. As this population grows, the demand for real-time, accessible communication technology becomes critical for inclusive societies.",
    },
  ];

  const whyUseSections = [
    {
      id: "real-time",
      icon: <FaChevronRight />,
      title: "Real-Time Translation",
      content:
        "Translate between signed and spoken languages in real-time. Our app allows you to communicate naturally and easily with anyone, anywhere, anytime, in your own sign language.",
    },
    {
      id: "personalize",
      icon: <FaCog />,
      title: "Personalize Appearance",
      content:
        "Personalize your experience with detection history, profile for each user.",
    },
    {
      id: "open-source",
      icon: <FaBook />,
      title: "Open Source Project",
      content:
        "Built by the community, for the community. Our open-source approach ensures transparency, continuous improvement, and contributions from developers worldwide.",
    },
    {
      id: "offline",
      icon: <FaWifi />,
      title: "Offline Functionality",
      content:
        "Access essential features even without an internet connection. Store your translation history and use core functionality anywhere, anytime.",
    },
  ];

  const faqData = [
    {
      id: 1,
      question: "What is ASL, and how does it work?",
      answer:
        "ASL stands for American Sign Language, a complete, natural, visual-spatial language used primarily by Deaf and hard-of-hearing people in the U.S. and Canada, using handshapes, movement, facial expressions, and body language to convey meaning, with its own grammar distinct from English. It's a rich, living language that developed in North America and is also recognized as a minority language in parts of Canada. ",
    },
    {
      id: 2,
      question: "How does our app contribute to accessibility and inclusion?",
      answer:
        "Our app breaks down communication barriers by providing real-time translation between sign languages and spoken languages. This enables Deaf and hard-of-hearing individuals to communicate more easily with hearing individuals, access information in their preferred language, and participate more fully in education, employment, and social activities.",
    },
    {
      id: 3,
      question: "How can i contact for further information?",
      answer:
        "You can contact with the team via email: abc@gmail.com or through our social medias: facebook, instagram.",
    },
    {
      id: 4,
      question: "How can I get started ?",
      answer:
        "Getting started with ASL translation website is easy! Simply access our app, create an account, and enable your camera to detect sign language and then can save your detection history or convert to spoken language. You can start translating immediately using your device's camera for sign language input or typing for spoken language input.",
    },
    {
      id: 5,
      question: "What is the process for contributing to our work?",
      answer:
        "As an open-source project, we welcome contributions from developers and sign language experts worldwide. You can contribute by submitting code on our GitHub repository, helping with language data collection, improving translation accuracy, or reporting bugs. Visit our GitHub page for contribution guidelines and documentation.",
    },
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const activeContent = whyUseSections.find(
    (section) => section.id === activeSection
  );

  return (
    <div className="about-container">
      {/* Hero Slider Section */}
      <section className="hero-slider">
        <div className="slide-container">
          {/* Background Image */}
          <div className="slide-background">
            <img
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title || "Slide"}
              className="slide-image"
            />
            <div className="slide-overlay"></div>
          </div>

          {/* Description - Bottom Left */}
          <div className="slide-content">
            <p className="slide-text">
              {slides[currentSlide].description}{" "}
              <span className="highlight-number">
                {slides[currentSlide].highlight}
              </span>{" "}
              {slides[currentSlide].continuation}
            </p>
          </div>

          {/* Navigation Arrows */}
          <button
            className="nav-arrow nav-arrow-left"
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <FaChevronLeft />
          </button>

          <button
            className="nav-arrow nav-arrow-right"
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <FaChevronRight />
          </button>

          {/* Slide Indicators */}
          <div className="slide-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${
                  index === currentSlide ? "active" : ""
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Overall Section */}
      <section className="overall-section">
        <div className="overall-wrapper">
          {/* Left Side - Text Content */}
          <div className="overall-text-content">
            <h2 className="overall-section-title">
              Glimpse into the future of{" "}
              <span className="highlight-text">accessibility</span>
            </h2>
            <p className="overall-description">
              Translate anything into sign language, using machine learning.
            </p>
            <p className="overall-description">
              Our advanced AI technology bridges the communication gap, making
              American Sign Language accessible to everyone through real-time
              gesture recognition and translation.
            </p>
            <Link to="/home">
              <button className="overall-cta-button">Translate now →</button>
            </Link>
          </div>

          {/* Right Side - Video Demo */}
          <div className="overall-video-content">
            <div className="video-demo-card">
              <div className="video-demo-wrapper">
                {/* Replace with your actual video */}
                <video
                  className="demo-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop"
                >
                  <source src="/videos/asl-demo.mp4" type="video/mp4" />
                  {/* Fallback image if video doesn't load */}
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop"
                    alt="ASL Demo"
                    className="demo-fallback-image"
                  />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Use Section with Sidebar */}
      <section className="why-use-section">
        <h2 className="why-use-title">Why use ?</h2>
        <p className="why-use-subtitle">
          Overcome language barriers and engage with people from diverse
          linguistic and cultural backgrounds, wherever and whenever you need.
        </p>

        <div className="why-use-container">
          {/* Left Sidebar */}
          <div className="why-use-sidebar">
            {whyUseSections.map((section) => (
              <button
                key={section.id}
                className={`sidebar-item ${
                  activeSection === section.id ? "active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="sidebar-icon">{section.icon}</span>
                <span className="sidebar-text">{section.title}</span>
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="why-use-content-area">
            <div className="content-card">
              <div className="content-icon">{activeContent.icon}</div>
              <h3 className="content-title">{activeContent.title}</h3>
              <p className="content-description">{activeContent.content}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-container">
          <div className="faq-header">
            <h2 className="faq-title">FAQ</h2>
            <p className="faq-subtitle">
              Find answers to common questions about sign.mt, our open research
              project dedicated to advancing sign language translation. Learn
              how our work contributes to accessibility, inclusion, and the
              future of human communication.
            </p>
          </div>

          <div className="faq-list">
            {faqData.map((faq) => (
              <div
                key={faq.id}
                className={`faq-item ${openFaq === faq.id ? "open" : ""}`}
              >
                <button
                  className="faq-question"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={openFaq === faq.id}
                >
                  <span>{faq.question}</span>
                  {openFaq === faq.id ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
