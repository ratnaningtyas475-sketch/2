import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldAlert, Download, Play, CheckCircle, XCircle, AlertTriangle, FileText } from 'lucide-react';

// --- Firebase Initialization ---
let app, auth, db, appId;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (e) {
  console.error("Firebase init failed:", e);
}

// --- Quiz Data (10 Sample C5 Questions. Structure ready for 80) ---
const quizQuestions = [
  {
    id: 1,
    topic: "Narrative Text - Generic Structure",
    text: "Read the following narrative extract: 'The king, seeing that the dragon had destroyed the entire village, decided to offer his crown to anyone who could tame the beast. A young farmer stepped forward, not with a sword, but with a strange, soothing flute.'\n\nEvaluate the effectiveness of this complication and proposed resolution. Which statement best critiques the narrative structure here?",
    options: [
      "A. It fails because a farmer cannot logically defeat a dragon.",
      "B. It is highly effective as it subverts the typical 'violent knight' resolution, setting up a unique climax based on wit/art.",
      "C. It is weak because it lacks an orientation explaining why the dragon attacked.",
      "D. It is confusing because the resolution happens before the climax.",
      "E. It is standard and predictable, relying heavily on traditional fairy-tale tropes without innovation."
    ],
    answerIndex: 1,
    explanation: "C5 requires judging effectiveness. Option B correctly evaluates how the structure subverts tropes to create a stronger narrative arc."
  },
  {
    id: 2,
    topic: "Descriptive Text - Place",
    text: "Consider this description: 'The old library smelled of damp earth and forgotten secrets. Shadows danced wildly across the towering bookshelves as the solitary candle flickered, making the leather-bound tomes look like sleeping gargoyles.'\n\nJudge which language feature contributes most significantly to creating an atmosphere of mystery and slight dread.",
    options: [
      "A. The use of past tense to show the library is old.",
      "B. The simple adjectives like 'old' and 'solitary'.",
      "C. The personification of shadows and the simile comparing books to gargoyles.",
      "D. The spatial structure of the description moving from smell to sight.",
      "E. The literal description of the lighting conditions."
    ],
    answerIndex: 2,
    explanation: "Evaluating figurative language: personification and simile actively transform a mundane setting into a menacing one."
  },
  {
    id: 3,
    topic: "Procedure Text - Generic Structure",
    text: "A student writes a procedure for 'How to Operate a Fire Extinguisher'. They place the step 'Pull the safety pin' AFTER 'Squeeze the lever'.\n\nEvaluate the consequence of this structural error.",
    options: [
      "A. The procedure becomes slightly less efficient but still works.",
      "B. The language features become grammatically incorrect.",
      "C. The procedure fails completely because squeezing the lever is physically impossible while the pin is intact.",
      "D. It changes the text from a procedure to a recount.",
      "E. It makes the 'Goal' of the text unclear to the reader."
    ],
    answerIndex: 2,
    explanation: "Evaluating structural logic in procedures requires understanding real-world consequences of sequence."
  },
  {
    id: 4,
    topic: "Narrative Text - Language Features",
    text: "In a story, the author frequently switches from past tense (e.g., 'she walked') to historical present tense (e.g., 'suddenly, the door slams open').\n\nAssess the likely purpose and effect of this tense shift.",
    options: [
      "A. It is simply a grammatical error that weakens the story.",
      "B. It serves to confuse the reader about the timeline of events.",
      "C. It is used to suddenly heighten tension and make the action feel immediate to the reader.",
      "D. It shifts the narrative point of view from third person to first person.",
      "E. It is a standard requirement for the 'resolution' phase of a narrative."
    ],
    answerIndex: 2,
    explanation: "Evaluating language choices: historical present is a deliberate stylistic choice to increase immediacy and tension."
  },
  {
    id: 5,
    topic: "Descriptive Text - Someone",
    text: "Critique the following description of a person: 'He was tall. He had black hair. He wore a blue shirt. He looked angry.'\n\nWhat is the most valid criticism regarding its language features for a high-school level text?",
    options: [
      "A. It lacks compound sentences entirely.",
      "B. It fails to use present tense, which is mandatory for descriptions.",
      "C. It relies exclusively on weak, linking verbs (was, had, wore, looked) and lacks vivid adjectives or figurative language.",
      "D. It does not include an identification paragraph.",
      "E. The physical traits described contradict the emotional state."
    ],
    answerIndex: 2,
    explanation: "Evaluating text quality: C5 involves critiquing the depth and variety of vocabulary used in descriptions."
  },
  {
    id: 6,
    topic: "Procedure Text - Language Features",
    text: "Evaluate the use of the passive voice in a procedure text about a science experiment (e.g., 'The solution is then heated for 5 minutes'). Why might this be preferred over the active voice ('You then heat the solution')?",
    options: [
      "A. Passive voice is more engaging and entertaining for the reader.",
      "B. It emphasizes the action and the object being acted upon, rather than the person doing it, maintaining objectivity.",
      "C. It is a strict grammatical rule that procedures cannot use pronouns.",
      "D. It makes the steps seem optional rather than mandatory.",
      "E. Active voice is always preferred; this is a poor use of passive voice."
    ],
    answerIndex: 1,
    explanation: "Judging stylistic choices: Passive voice in scientific procedures prioritizes the process over the actor."
  },
  {
    id: 7,
    topic: "Narrative Text - Moral Value",
    text: "A narrative ends with the protagonist sacrificing their hard-earned wealth to save a village, but the village ultimately forgets their sacrifice.\n\nEvaluate the thematic impact of this resolution.",
    options: [
      "A. It creates a tragic, cynical tone that challenges the traditional 'good deeds are rewarded' fable structure.",
      "B. It proves that the protagonist was foolish to help others.",
      "C. It is an invalid narrative because it lacks a happy ending.",
      "D. It reinforces the importance of wealth over community.",
      "E. It shows that the orientation phase was poorly written."
    ],
    answerIndex: 0,
    explanation: "Evaluating themes: C5 requires students to assess how non-traditional endings affect the overall message."
  },
  {
    id: 8,
    topic: "Descriptive Text - Generic Structure",
    text: "If a descriptive text about a historical monument begins immediately with 'The walls are made of white marble, standing 50 meters tall', what structural element is missing and how does it affect the reader?",
    options: [
      "A. The Description; the reader doesn't know what it looks like.",
      "B. The Reorientation; the reader lacks a summary of the writer's opinion.",
      "C. The Identification; the reader is disoriented because the specific subject hasn't been introduced.",
      "D. The Complication; there is no conflict to keep the reader interested.",
      "E. The Materials list; the reader cannot build the monument."
    ],
    answerIndex: 2,
    explanation: "Evaluating structure: Missing an identification phase leaves the audience without context."
  },
  {
    id: 9,
    topic: "Procedure Text - Language Features (Adverbials)",
    text: "Assess the importance of the adverbial phrase in the step: 'Stir the mixture gently for exactly three minutes until it thickens.'",
    options: [
      "A. It is unnecessary filler; 'Stir the mixture' is sufficient.",
      "B. 'Gently' is important, but the time frame is irrelevant in cooking procedures.",
      "C. It provides critical parameters (manner, time, condition) necessary to achieve the specific goal without failure.",
      "D. It acts as an imperative verb, commanding the user.",
      "E. It shifts the text from a procedure to a descriptive text."
    ],
    answerIndex: 2,
    explanation: "Evaluating detail importance: Adverbials in procedures are crucial for precision and success."
  },
  {
    id: 10,
    topic: "Cross-Topic Analysis",
    text: "Compare the use of 'time connectives' in Narrative texts (e.g., 'then', 'suddenly') and Procedure texts (e.g., 'first', 'next'). Evaluate their primary difference in function.",
    options: [
      "A. In narratives, they build tension and sequence plot; in procedures, they strictly enforce a logical, chronological sequence of actions.",
      "B. They serve the exact same function in both text types.",
      "C. Narratives use them to describe settings, while procedures use them to describe tools.",
      "D. Procedures use time connectives to entertain, while narratives use them to instruct.",
      "E. Time connectives are actually considered poor grammar in both text types."
    ],
    answerIndex: 0,
    explanation: "Evaluating functional language across genres."
  },
  {
    id: 11,
    topic: "Procedure Text - Generic Structure",
    text: "A manual for assembling a computer completely omits the 'Materials/Tools Needed' section, starting directly with the steps. Evaluate the impact of this omission on the user.",
    options: [
      "A. It makes the procedure more efficient to read.",
      "B. The user might begin the process and get stuck halfway because they lack a required tool, leading to frustration and failure.",
      "C. It changes the text genre into a descriptive text about a computer.",
      "D. It is perfectly fine as long as the steps contain imperative verbs.",
      "E. It only affects the aesthetic layout of the document, not its functionality."
    ],
    answerIndex: 1,
    explanation: "Evaluating structural necessity: The materials section is vital for preparation before execution in complex procedures."
  },
  {
    id: 12,
    topic: "Descriptive Text - Language Features",
    text: "Evaluate the following sentence from a travel brochure: 'The breathtaking sunset over the majestic mountains will leave you utterly speechless.' What makes this language effective for its specific purpose?",
    options: [
      "A. It relies on objective, measurable facts to inform the reader accurately.",
      "B. It utilizes strong imperative verbs to command the reader.",
      "C. It uses highly subjective, emotive adjectives to persuade and entice the reader to visit.",
      "D. It establishes a clear chronological sequence of events.",
      "E. It avoids descriptive language entirely to keep the text concise."
    ],
    answerIndex: 2,
    explanation: "Evaluating text purpose vs. language: Travel brochures require subjective, emotive language rather than objective facts."
  },
  {
    id: 13,
    topic: "Narrative Text - Complication",
    text: "In a story, the main character's internal fear of failure prevents them from entering a competition. Assess this type of complication compared to a physical villain.",
    options: [
      "A. It is an invalid complication because narratives require physical conflict.",
      "B. It is a psychological (internal) conflict, which can create a more relatable and complex character arc than a simple physical villain.",
      "C. It belongs in a descriptive text, not a narrative.",
      "D. It makes the orientation phase too long.",
      "E. It prevents the story from ever reaching a resolution."
    ],
    answerIndex: 1,
    explanation: "Evaluating narrative elements: Internal conflicts often provide deeper character development (C5 level analysis)."
  },
  {
    id: 14,
    topic: "Descriptive Text - Place",
    text: "Read the description: 'The classroom was 10x10 meters. It had 20 desks. The whiteboard was 2 meters wide. The walls were painted white.' Critique this description for a creative writing assignment.",
    options: [
      "A. It is excellent because it provides precise, factual details.",
      "B. It is a procedure text, not a descriptive text.",
      "C. It is too reliant on active verbs and lacks passive voice.",
      "D. It is overly objective and sterile, lacking sensory details (sight, sound, smell) that would make the setting vivid for the reader.",
      "E. It contains too many complex sentences, confusing the reader."
    ],
    answerIndex: 3,
    explanation: "Critiquing text quality: Creative descriptions require sensory details, not just bare measurements."
  },
  {
    id: 15,
    topic: "Procedure Text - Language Features",
    text: "Evaluate the appropriateness of using metaphors and similes (e.g., 'Cut the paper so it looks like a dancing swan') in a technical procedure for operating heavy machinery.",
    options: [
      "A. It is highly appropriate as it makes the manual fun to read.",
      "B. It is dangerous and inappropriate; technical procedures require precise, literal, and unambiguous language to ensure safety.",
      "C. It helps the user understand the steps faster.",
      "D. It is necessary to meet the generic structure of a procedure.",
      "E. It successfully replaces the need for imperative verbs."
    ],
    answerIndex: 1,
    explanation: "Evaluating language appropriateness: Figurative language in safety manuals can lead to dangerous misinterpretations."
  },
  {
    id: 16,
    topic: "Narrative Text - Coda/Moral",
    text: "A fable about a deceptive fox ends without a moral or coda, leaving the fox successfully tricking everyone and escaping. Evaluate the effect of this missing generic structure.",
    options: [
      "A. It ruins the story completely, making it unreadable.",
      "B. It changes the text into a descriptive text about a fox.",
      "C. It subverts reader expectations of a fable, leaving an unsettling, unresolved feeling that challenges the idea of 'poetic justice'.",
      "D. It makes the orientation phase irrelevant.",
      "E. It proves that the fox was the protagonist."
    ],
    answerIndex: 2,
    explanation: "Evaluating structural choices: Omitting a traditional coda in a fable forces the reader to rethink the narrative's purpose."
  },
  {
    id: 17,
    topic: "Descriptive Text - Someone",
    text: "Compare describing someone as 'a successful businessman' versus 'a man whose tailored suit couldn't hide the permanent exhaustion etched around his eyes.' Which is more effective for characterization, and why?",
    options: [
      "A. 'A successful businessman' because it is shorter and faster to read.",
      "B. The second phrase, because it uses specific visual details to imply deeper truths about his lifestyle and internal state, rather than just stating a label.",
      "C. They are equally effective as they mean the exact same thing.",
      "D. The first phrase, because it uses proper chronological order.",
      "E. The second phrase, because it uses imperative verbs."
    ],
    answerIndex: 1,
    explanation: "Evaluating descriptive efficacy: 'Show, don't tell' is a key concept in advanced character description."
  },
  {
    id: 18,
    topic: "Procedure Text - Action Verbs",
    text: "If a procedure text replaces all imperative action verbs (e.g., 'Mix', 'Bake', 'Pour') with suggestions (e.g., 'You could mix', 'Maybe bake', 'Try pouring'), assess the impact on the text.",
    options: [
      "A. The text becomes more polite and therefore better.",
      "B. The text loses its instructive authority and clarity, likely causing the user to fail the task.",
      "C. The text successfully transforms into a narrative.",
      "D. It has no impact on the outcome of the procedure.",
      "E. It improves the chronological sequence."
    ],
    answerIndex: 1,
    explanation: "Evaluating grammatical impact: Imperative verbs are non-negotiable for the authoritative function of a procedure."
  },
  {
    id: 19,
    topic: "Narrative Text - Resolution",
    text: "Evaluate a narrative where the climax involves an intense battle, but the resolution simply states, 'And then everyone went home and slept.' What is the main flaw here?",
    options: [
      "A. The resolution is too long and drags down the pacing.",
      "B. The resolution fails to address the emotional or physical consequences of the climax, leaving the narrative feeling abrupt and unfulfilling.",
      "C. It uses the past tense incorrectly.",
      "D. It includes too much descriptive language.",
      "E. It lacks a clear orientation."
    ],
    answerIndex: 1,
    explanation: "Critiquing narrative flow: A resolution must adequately tie up the emotional threads of the climax."
  },
  {
    id: 20,
    topic: "Cross-Topic Analysis",
    text: "Evaluate the primary difference in how the 'reader' is treated in a Procedure text versus a Descriptive text.",
    options: [
      "A. In a Procedure text, the reader is a passive observer; in a Descriptive text, they are an active participant.",
      "B. In a Procedure text, the reader is directly commanded to perform actions (active participant); in a Descriptive text, the reader is an observer invited to visualize a scene.",
      "C. Both texts treat the reader exactly the same way.",
      "D. Procedure texts ignore the reader, while Descriptive texts command the reader.",
      "E. Descriptive texts require the reader to use physical tools."
    ],
    answerIndex: 1,
    explanation: "Evaluating audience relationship: Procedures are interactive (do this), descriptions are imaginative (visualize this)."
  }
  // Teachers/Admins can continue adding up to 80 questions following this exact format.
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // App State: 'loading', 'home', 'instructions', 'quiz', 'result'
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [attemptStatus, setAttemptStatus] = useState(null); // 'none', 'completed'
  
  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
  
  // Anti-cheat State
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const maxWarnings = 2; // 3rd time they leave, auto-submit

  // --- 1. Firebase Auth & Initialization ---
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      setCurrentScreen('home');
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await checkAttemptStatus(currentUser.uid);
      } else {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 2. Check Previous Attempts ---
  const checkAttemptStatus = async (uid) => {
    if (!db) return;
    try {
      const attemptRef = doc(db, 'artifacts', appId, 'users', uid, 'quiz_status');
      const attemptSnap = await getDoc(attemptRef);
      
      if (attemptSnap.exists() && attemptSnap.data().completed) {
        setAttemptStatus('completed');
        setScore(attemptSnap.data().score);
        setCurrentScreen('result');
      } else {
        setAttemptStatus('none');
        setCurrentScreen('home');
      }
    } catch (err) {
      console.error("Error checking status:", err);
      setCurrentScreen('home');
    } finally {
      setAuthLoading(false);
    }
  };

  // --- 3. Anti-Cheat Visibility API ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentScreen === 'quiz') {
        handleCheatDetected();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentScreen, cheatWarnings]);

  const handleCheatDetected = () => {
    const newWarnings = cheatWarnings + 1;
    setCheatWarnings(newWarnings);
    
    if (newWarnings > maxWarnings) {
      // Force submit
      finishQuiz(score); 
    } else {
      setShowWarningModal(true);
    }
  };

  // --- 4. Quiz Logic ---
  const startQuiz = () => {
    setCurrentScreen('quiz');
    setCurrentQuestionIndex(0);
    setScore(0);
    setCheatWarnings(0);
    setSelectedOption(null);
    setIsAnswerCorrect(null);
  };

  const handleOptionSelect = (index) => {
    if (selectedOption !== null) return; // Only allow one selection
    
    setSelectedOption(index);
    const correct = index === quizQuestions[currentQuestionIndex].answerIndex;
    setIsAnswerCorrect(correct);
    
    if (correct) {
      // 100 points total, divided by number of questions
      setScore(prev => prev + (100 / quizQuestions.length));
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerCorrect(null);
    } else {
      finishQuiz(score + (isAnswerCorrect ? (100 / quizQuestions.length) : 0)); // Ensure last score is caught if state batched
    }
  };

  const finishQuiz = async (finalScore) => {
    const roundedScore = Math.round(finalScore);
    setScore(roundedScore);
    setCurrentScreen('result');

    if (user && db) {
      try {
        const attemptRef = doc(db, 'artifacts', appId, 'users', user.uid, 'quiz_status');
        await setDoc(attemptRef, {
          completed: true,
          score: roundedScore,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Error saving score:", err);
      }
    }
  };

  // --- 5. Certificate Generation (Canvas) ---
  const downloadCertificate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    ctx.strokeStyle = '#fbbf24'; // amber-400
    ctx.lineWidth = 5;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Text Setup
    ctx.textAlign = 'center';
    
    // Header
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.font = 'bold 48px serif';
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', canvas.width / 2, 120);
    
    ctx.font = 'italic 24px serif';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText('This is to certify that', canvas.width / 2, 200);

    // Name (Using User ID prefix or generic if anon)
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#2563eb'; // blue-600
    const studentName = user ? `Student-${user.uid.substring(0, 6).toUpperCase()}` : 'English Student';
    ctx.fillText(studentName, canvas.width / 2, 260);

    // Body
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('has successfully completed the', canvas.width / 2, 320);
    
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SMK Class X English HOTS Quiz (C5 Level)', canvas.width / 2, 360);
    
    // Score
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = score >= 70 ? '#16a34a' : '#ea580c'; // green or orange
    ctx.fillText(`Score: ${score}`, canvas.width / 2, 450);

    // Footer
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    const date = new Date().toLocaleDateString();
    ctx.fillText(`Date: ${date}`, canvas.width / 2, 530);

    // Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `English_HOTS_Certificate_${studentName}.png`;
    link.href = dataUrl;
    link.click();
  };

  // --- Renders ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none" 
      onContextMenu={(e) => e.preventDefault()} 
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center border-b-4 border-blue-600">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-600 w-8 h-8" />
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">SMK English Explorer</h1>
        </div>
        {user && (
          <div className="text-sm bg-slate-100 px-3 py-1 rounded-full font-mono text-slate-600 border border-slate-200">
            ID: {user.uid.substring(0, 8)}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 mt-4">
        
        {/* --- Home Screen --- */}
        {currentScreen === 'home' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
            <h2 className="text-3xl font-extrabold text-slate-800 mb-4">Class X English HOTS Evaluation</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Test your high-order thinking skills (Evaluating - C5) across Narrative, Descriptive, and Procedure texts.
            </p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 text-left max-w-xl mx-auto space-y-3">
              <h3 className="font-bold text-blue-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Rules & Regulations
              </h3>
              <ul className="list-disc pl-5 text-sm text-blue-900 space-y-1">
                <li>You can only take this quiz <strong>once</strong>.</li>
                <li>Each question can only be answered <strong>once</strong> (no changing answers).</li>
                <li><strong>Anti-Cheat Enabled:</strong> Leaving this tab or opening translation apps will trigger a warning. Multiple warnings will auto-submit your test.</li>
                <li>Pass score is 70. A certificate is available upon completion.</li>
              </ul>
            </div>

            <button 
              onClick={() => setCurrentScreen('instructions')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
            >
              <Play className="w-5 h-5" /> Begin Assessment
            </button>
          </div>
        )}

        {/* --- Instructions Screen --- */}
        {currentScreen === 'instructions' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">Preparation</h2>
            <p className="mb-4">You are about to start the test. Make sure you are in a quiet environment.</p>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 w-6 h-6 flex-shrink-0 mt-1" />
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> The system monitors tab switching. Do not open dictionaries or translators. If you switch tabs more than {maxWarnings} times, your test will end immediately with a score of 0 for remaining questions.
              </p>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button 
                onClick={() => setCurrentScreen('home')}
                className="px-6 py-2 rounded-lg text-slate-500 hover:bg-slate-100 font-medium transition"
              >
                Back
              </button>
              <button 
                onClick={startQuiz}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition"
              >
                I Understand, Start Now
              </button>
            </div>
          </div>
        )}

        {/* --- Quiz Screen --- */}
        {currentScreen === 'quiz' && (
          <div className="animate-fade-in">
            {/* Progress & Stats */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="font-semibold text-slate-700 mb-2 sm:mb-0">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </div>
              <div className="flex gap-4">
                <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  {quizQuestions[currentQuestionIndex].topic}
                </div>
                {cheatWarnings > 0 && (
                  <div className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Warnings: {cheatWarnings}/{maxWarnings}
                  </div>
                )}
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
              <div className="prose max-w-none text-slate-800 text-lg mb-8 whitespace-pre-wrap leading-relaxed">
                {quizQuestions[currentQuestionIndex].text}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                  let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 relative ";
                  let icon = null;

                  if (selectedOption === null) {
                    btnClass += "border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer text-slate-700";
                  } else {
                    btnClass += "cursor-not-allowed ";
                    if (idx === quizQuestions[currentQuestionIndex].answerIndex) {
                      // This is the correct answer
                      btnClass += "border-green-500 bg-green-50 text-green-900 font-medium";
                      icon = <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500" />;
                    } else if (idx === selectedOption) {
                      // This is the wrong answer the user selected
                      btnClass += "border-red-500 bg-red-50 text-red-900";
                      icon = <XCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500" />;
                    } else {
                      // Unselected wrong answers
                      btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={selectedOption !== null}
                      className={btnClass}
                    >
                      {option}
                      {icon}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (Shows after selection) */}
              {selectedOption !== null && (
                <div className={`mt-6 p-4 rounded-lg text-sm border-l-4 ${isAnswerCorrect ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                  <strong>{isAnswerCorrect ? 'Correct!' : 'Incorrect.'}</strong> {quizQuestions[currentQuestionIndex].explanation}
                </div>
              )}
            </div>

            {/* Next Button */}
            <div className="flex justify-end">
              <button
                onClick={handleNextQuestion}
                disabled={selectedOption === null}
                className={`py-3 px-8 rounded-xl font-bold shadow-md transition-all ${
                  selectedOption === null 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:-translate-y-1'
                }`}
              >
                {currentQuestionIndex < quizQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </button>
            </div>
          </div>
        )}

        {/* --- Result / Certificate Screen --- */}
        {currentScreen === 'result' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in relative overflow-hidden">
            {/* Decorative background circle */}
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 ${score >= 70 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            
            <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Quiz Completed!</h2>
            <p className="text-slate-500 mb-8">Your final evaluation score is ready.</p>
            
            <div className="flex justify-center mb-8">
              <div className={`relative flex items-center justify-center w-48 h-48 rounded-full border-8 ${score >= 70 ? 'border-green-400 bg-green-50' : 'border-orange-400 bg-orange-50'}`}>
                <div className={`text-6xl font-black ${score >= 70 ? 'text-green-600' : 'text-orange-600'}`}>
                  {score}
                </div>
              </div>
            </div>

            <p className="text-xl font-medium mb-8">
              {score >= 70 
                ? "Excellent critical thinking! You have demonstrated strong C5 Evaluating skills."
                : "Keep practicing. Analyzing and evaluating texts requires careful attention to detail and structure."}
            </p>

            <button
              onClick={downloadCertificate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
            >
              <Download className="w-5 h-5" /> Download Certificate
            </button>
          </div>
        )}

      </main>

      {/* --- Warning Modal (Anti-Cheat) --- */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full animate-pop-in">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">Warning!</h3>
            <p className="text-center text-slate-600 mb-6">
              You left the quiz tab. Opening translation apps or other resources is not allowed. 
              <br/><br/>
              <strong>Warning {cheatWarnings} of {maxWarnings}</strong>
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition"
            >
              Return to Quiz
            </button>
          </div>
        </div>
      )}

      {/* Custom Styles for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-pop-in {
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </div>
  );
}