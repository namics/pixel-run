import React from "react";
import PropTypes from "prop-types";

const StepHeader = ({ wordmark, question }) => {
  return (
    <header>
      <div className="grid grid-full">
        <div className="col-2-3">
          <h1 className="wordmark">
            {wordmark} <br />
            Pixel. Run. <span className="last">Namics.</span>
          </h1>
        </div>
        <div className="col-1-3 align-right">
          <h2 className="question">{question}</h2>
        </div>
      </div>
    </header>
  );
};

StepHeader.prototypes = {
  wordmark: PropTypes.string,
  question: PropTypes.string
};

export default StepHeader;
