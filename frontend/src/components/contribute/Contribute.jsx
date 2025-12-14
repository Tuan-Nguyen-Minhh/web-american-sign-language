import React from "react";
import { FaCode, FaLanguage, FaCommentDots, FaStar } from "react-icons/fa";
import "./contribute.css";

export default function Contribute() {
  const contributeCards = [
    {
      id: 1,
      icon: <FaCode />,
      title: "Develop",
      subtitle: "Fix bugs. Implement new models. Improve the code.",
      description:
        "By contributing to the development of the app, you can help improve the quality of the code, fix any existing bugs, and even implement new features and models. You can find the source code on GitHub and start contributing today. Every line of code counts!",
      buttonText: "VIEW ON GITHUB",
      buttonLink:
        "https://github.com/Tuan-Nguyen-Minhh/web-american-sign-language",
    },

    {
      id: 2,
      icon: <FaCommentDots />,
      title: "Provide Feedback",
      subtitle: "Let us know how to make the app better!",
      description:
        "By providing feedback, you can help us improve the app and make it better for everyone. Whether you have a suggestion for a new feature, or you found a bug, your feedback is valuable to us. You can reach us on GitHub or through our feedback form. Every voice counts!",
      buttonText: "GIVE FEEDBACK",
      buttonLink:
        "https://docs.google.com/forms/d/e/1FAIpQLSeOkGLbxjNeP1LpaIHn4NGtT9lKDTgnQ4Isukg-n0To2nGzkw/viewform",
    },
  ];

  return (
    <div className="contribute-container">
      <div className="contribute-content">
        {/* Header Section */}
        <div className="contribute-header">
          <h1 className="contribute-title">Join Our Efforts</h1>
          <p className="contribute-description">
            Our sign language translation app is open source and always
            improving, but we need your help! By contributing to the project,
            you can help make the app more accessible to more users.
          </p>
        </div>

        {/* Cards Section */}
        <div className="contribute-cards">
          {contributeCards.map((card) => (
            <div key={card.id} className="contribute-card">
              <div className="card-icon-wrapper">
                <div className="card-icon">{card.icon}</div>
                <h2 className="card-title">{card.title}</h2>
              </div>

              <p className="card-subtitle">{card.subtitle}</p>

              <p className="card-description">{card.description}</p>

              <a
                href={card.buttonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="card-button"
              >
                {card.buttonText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
