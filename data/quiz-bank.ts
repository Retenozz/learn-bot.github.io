export type QuizSubject = "Physics" | "Mathematics" | "General";

export type QuizQuestion = {
  id: string;
  subject: QuizSubject;
  topic: string;
  concept: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const quizQuestionBank: QuizQuestion[] = [
  {
    id: "phy-001",
    subject: "Physics",
    topic: "แรงและการเคลื่อนที่",
    concept: "กฎการเคลื่อนที่ข้อที่ 2",
    prompt: "วัตถุมวล 2 กิโลกรัม ถูกออกแรง 10 นิวตัน ความเร่งของวัตถุเท่ากับเท่าไร",
    options: ["2 m/s^2", "5 m/s^2", "10 m/s^2", "20 m/s^2"],
    correctIndex: 1,
    explanation: "ใช้สูตร F = ma ดังนั้น a = 10 / 2 = 5 m/s^2",
  },
  {
    id: "phy-002",
    subject: "Physics",
    topic: "แรงและการเคลื่อนที่",
    concept: "แรงลัพธ์",
    prompt: "ถ้ามีแรง 8 นิวตันไปทางขวา และ 3 นิวตันไปทางซ้าย แรงลัพธ์มีค่าเท่าไร",
    options: ["5 นิวตันไปทางขวา", "5 นิวตันไปทางซ้าย", "11 นิวตันไปทางขวา", "0 นิวตัน"],
    correctIndex: 0,
    explanation: "แรงลัพธ์เท่ากับ 8 - 3 = 5 นิวตัน และทิศตามแรงที่มากกว่า คือไปทางขวา",
  },
  {
    id: "phy-003",
    subject: "Physics",
    topic: "กราฟการเคลื่อนที่",
    concept: "ความเร็วจากกราฟระยะทาง-เวลา",
    prompt: "ถ้าวัตถุเคลื่อนที่ได้ระยะทาง 20 เมตรใน 4 วินาที ความเร็วเฉลี่ยเท่ากับเท่าไร",
    options: ["4 m/s", "5 m/s", "8 m/s", "10 m/s"],
    correctIndex: 1,
    explanation: "ความเร็วเฉลี่ย = ระยะทาง / เวลา = 20 / 4 = 5 m/s",
  },
  {
    id: "phy-004",
    subject: "Physics",
    topic: "พลังงาน",
    concept: "พลังงานจลน์",
    prompt: "วัตถุมวล 2 กิโลกรัม เคลื่อนที่ด้วยความเร็ว 3 m/s มีพลังงานจลน์เท่าไร",
    options: ["3 จูล", "6 จูล", "9 จูล", "18 จูล"],
    correctIndex: 2,
    explanation: "พลังงานจลน์ = 1/2 mv^2 = 1/2 x 2 x 3^2 = 9 จูล",
  },
  {
    id: "math-001",
    subject: "Mathematics",
    topic: "ฟังก์ชัน",
    concept: "การแทนค่าในฟังก์ชัน",
    prompt: "ถ้า f(x) = 2x + 3 แล้ว f(4) มีค่าเท่าไร",
    options: ["8", "10", "11", "12"],
    correctIndex: 2,
    explanation: "แทน x = 4 จะได้ 2(4) + 3 = 11",
  },
  {
    id: "math-002",
    subject: "Mathematics",
    topic: "ฟังก์ชัน",
    concept: "ความชันเส้นตรง",
    prompt: "เส้นตรงผ่านจุด (1,2) และ (3,6) มีความชันเท่าไร",
    options: ["1", "2", "3", "4"],
    correctIndex: 1,
    explanation: "ความชัน m = (6 - 2) / (3 - 1) = 4 / 2 = 2",
  },
  {
    id: "math-003",
    subject: "Mathematics",
    topic: "ความน่าจะเป็น",
    concept: "ความน่าจะเป็นพื้นฐาน",
    prompt: "โยนเหรียญ 1 ครั้ง ความน่าจะเป็นที่จะออกหัวเท่ากับเท่าไร",
    options: ["1/4", "1/3", "1/2", "1"],
    correctIndex: 2,
    explanation: "ผลลัพธ์ที่เป็นไปได้มี 2 แบบ และมีเพียง 1 แบบที่เป็นหัว ดังนั้นความน่าจะเป็นคือ 1/2",
  },
  {
    id: "math-004",
    subject: "Mathematics",
    topic: "เศษส่วน",
    concept: "การบวกเศษส่วน",
    prompt: "1/2 + 1/4 มีค่าเท่าไร",
    options: ["2/6", "3/4", "1/8", "2/4"],
    correctIndex: 1,
    explanation: "ทำส่วนให้เท่ากันจะได้ 1/2 = 2/4 แล้ว 2/4 + 1/4 = 3/4",
  },
];
