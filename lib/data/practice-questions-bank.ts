export type PracticeQuestion = {
  id: number;
  question_text: string;
  options: string[];
  correct_option: number; // 0, 1, 2, 3
  explanation: string;
  subject?: string;
};

export const questionBankBySubject: Record<string, PracticeQuestion[]> = {
  python: [
    {
      id: 101,
      question_text: "Which of the following data structures in Python is immutable?",
      options: ["List", "Dictionary", "Tuple", "Set"],
      correct_option: 2,
      explanation: "Tuples in Python are immutable sequences, meaning once created, their elements cannot be changed, added, or removed.",
    },
    {
      id: 102,
      question_text: "In Pandas, which method is used to return the first N rows of a DataFrame?",
      options: ["df.top(n)", "df.head(n)", "df.first(n)", "df.preview(n)"],
      correct_option: 1,
      explanation: "df.head(n) returns the first n rows of a DataFrame (default is 5 rows if n is not specified).",
    },
    {
      id: 103,
      question_text: "What does the NumPy function np.linspace(0, 10, 5) return?",
      options: [
        "5 integers randomly between 0 and 10",
        "Array of 5 evenly spaced values from 0 to 10 inclusive",
        "A range from 0 to 10 with step size 5",
        "A 5x5 matrix of zeros and tens",
      ],
      correct_option: 1,
      explanation: "np.linspace(start, stop, num) generates 'num' evenly spaced samples over the specified interval [start, stop].",
    },
    {
      id: 104,
      question_text: "In Scikit-Learn, which algorithm is used for Supervised Classification based on finding optimal hyperplanes?",
      options: ["K-Means Clustering", "Support Vector Machines (SVM)", "Principal Component Analysis (PCA)", "Apriori Algorithm"],
      correct_option: 1,
      explanation: "Support Vector Machines (SVM) find the optimal hyperplane that maximizes the margin between different data classes in feature space.",
    },
    {
      id: 105,
      question_text: "What is the output of len(set([1, 2, 2, 3, 4, 4, 4, 5])) in Python?",
      options: ["8", "5", "4", "Error"],
      correct_option: 1,
      explanation: "Sets in Python automatically filter out duplicate values. The set becomes {1, 2, 3, 4, 5} having length 5.",
    },
    {
      id: 106,
      question_text: "Which metric is best suited to evaluate classification models on highly imbalanced datasets?",
      options: ["Accuracy Score", "F1-Score / PR-AUC", "Mean Squared Error", "R-Squared"],
      correct_option: 1,
      explanation: "F1-Score (harmonic mean of Precision and Recall) or PR-AUC is preferred for imbalanced datasets because standard accuracy can be misleadingly high by predicting only the majority class.",
    },
    {
      id: 107,
      question_text: "What is the purpose of the 'iloc' indexer in Pandas?",
      options: [
        "Select by integer-location based indexing",
        "Select by label-based indexing",
        "Select by boolean condition only",
        "Insert a new column at specified index",
      ],
      correct_option: 0,
      explanation: "df.iloc is strictly integer-position based (from 0 to length-1 of the axis), whereas df.loc is label-based.",
    },
    {
      id: 108,
      question_text: "Which Python keyword is used to handle exceptions inside a try block?",
      options: ["catch", "except", "error", "handle"],
      correct_option: 1,
      explanation: "Python uses the 'try...except...finally' construct to catch and handle runtime exceptions.",
    },
    {
      id: 109,
      question_text: "What is the primary role of the Learning Rate hyperparameter in Gradient Descent?",
      options: [
        "Determines the batch size of training data",
        "Controls the step size taken towards a minimum during weight updates",
        "Specifies the number of hidden layers in a neural network",
        "Calculates the total training time in seconds",
      ],
      correct_option: 1,
      explanation: "The learning rate scales the magnitude of gradients during parameter updates, controlling how fast or slow the model converges.",
    },
    {
      id: 110,
      question_text: "Which of the following creates a Generator in Python?",
      options: ["List comprehension with []", "A function containing the 'yield' statement", "Lambda expression with return", "Dictionary comprehension"],
      correct_option: 1,
      explanation: "Any function that contains a 'yield' statement returns a Generator object, which yields values lazily on demand.",
    },
  ],
  general: [
    {
      id: 201,
      question_text: "What is the unit of Electric Current in the International System of Units (SI)?",
      options: ["Volt", "Ohm", "Ampere", "Watt"],
      correct_option: 2,
      explanation: "The Ampere (symbol: A) is the base SI unit of electric current.",
    },
    {
      id: 202,
      question_text: "If a train travels 360 km in 4 hours, what is its average speed in meters per second (m/s)?",
      options: ["20 m/s", "25 m/s", "30 m/s", "35 m/s"],
      correct_option: 1,
      explanation: "Speed in km/h = 360 / 4 = 90 km/h. To convert to m/s, multiply by 5/18: 90 * (5/18) = 25 m/s.",
    },
    {
      id: 203,
      question_text: "Which organelle is known as the 'Powerhouse of the Cell'?",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"],
      correct_option: 2,
      explanation: "Mitochondria generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy.",
    },
    {
      id: 204,
      question_text: "What is the value of log10(1000)?",
      options: ["1", "2", "3", "10"],
      correct_option: 2,
      explanation: "Since 10^3 = 1000, log10(1000) = 3.",
    },
    {
      id: 205,
      question_text: "Which chemical element has the symbol 'Fe'?",
      options: ["Fluorine", "Iron", "Francium", "Lead"],
      correct_option: 1,
      explanation: "Fe stands for Ferrum, the Latin word for Iron.",
    },
    {
      id: 206,
      question_text: "What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?",
      options: ["6x + 5", "3x + 5", "6x^2 + 5", "6x - 7"],
      correct_option: 0,
      explanation: "Using the power rule: d/dx(3x^2) = 6x, d/dx(5x) = 5, and d/dx(-7) = 0. Therefore, f'(x) = 6x + 5.",
    },
    {
      id: 207,
      question_text: "According to Newton's Second Law of Motion, Force equals:",
      options: ["Mass x Velocity", "Mass x Acceleration", "Mass / Acceleration", "Work x Time"],
      correct_option: 1,
      explanation: "Newton's second law states that Force (F) is the product of Mass (m) and Acceleration (a): F = m * a.",
    },
    {
      id: 208,
      question_text: "Which law states that at constant temperature, the volume of a given mass of gas is inversely proportional to its pressure?",
      options: ["Charles's Law", "Boyle's Law", "Avogadro's Law", "Gay-Lussac's Law"],
      correct_option: 1,
      explanation: "Boyle's Law states that P1 * V1 = P2 * V2 when temperature remains constant.",
    },
    {
      id: 209,
      question_text: "What is the sum of interior angles of a regular hexagon?",
      options: ["360 degrees", "540 degrees", "720 degrees", "900 degrees"],
      correct_option: 2,
      explanation: "Sum of interior angles = (n - 2) * 180 degrees. For a hexagon (n = 6): (6 - 2) * 180 = 4 * 180 = 720 degrees.",
    },
    {
      id: 210,
      question_text: "Which component of blood is primarily responsible for blood clotting?",
      options: ["Red Blood Cells", "White Blood Cells", "Platelets (Thrombocytes)", "Blood Plasma"],
      correct_option: 2,
      explanation: "Platelets (thrombocytes) aggregate and form fibrin clots to prevent bleeding when vascular injury occurs.",
    },
  ],
};

export function getQuestionsForTest(testTitle: string, subject?: string): PracticeQuestion[] {
  const combined = (testTitle + " " + (subject || "")).toLowerCase();

  if (combined.includes("python") || combined.includes("data") || combined.includes("machine") || combined.includes("code") || combined.includes("programming")) {
    return questionBankBySubject.python;
  }

  return questionBankBySubject.general;
}
