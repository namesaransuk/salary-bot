const salarySlips = ([, , , , , , slips]) => {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            "type": "image",
            "url": `${slips}`,
            "size": "md"
          }
        ],
      },
    };
  };

  module.exports = { salarySlips };