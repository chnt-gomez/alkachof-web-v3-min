import { Button } from '@/components/ui/button';

const mockQuestions = [
    {
        id: 1,
        question: "Are these true to size?",
        answer: "Yes, they run true to standard US sizing. We recommend ordering your usual size.",
    },
    {
        id: 2,
        question: "Is the velvet material easy to clean?",
        answer: "For best care, we suggest a soft brush or specialized velvet cleaner. Avoid harsh liquids.",
    },
    {
        id: 3,
        question: "What is the return policy for these shoes?",
        answer: "We offer a 30-day return window for unworn items in their original packaging.",
    },
];

export const ProductQuestionsFrame = () => {
    return (
        <div className="mt-4">
            <h3 className="px-4">
                Preguntas de los usuarios
            </h3>

            {/* Space utility for clean vertical separation */}
            <div className="space-y-4 mt-3">
                {mockQuestions.map((item) => (
                    // This div could be its own future component (QuestionAnswerItem)
                    <div key={item.id} className="space-y-4 mt-3 px-4">
                        {/* Question structure */}
                        <p className="font-semibold">
                            "{item.question}"
                        </p>

                        {/* Answer structure */}
                        <p className="pl-4 mt-1 italic" >
                            {item.answer}
                        </p>
                    </div>
                ))}
            </div>

            {/* Full-width button for asking a question */}
           <div className="w-full mt-6 py-2 px-4">
                <Button 
                    // flex-1 for layout (takes up equal space)
                    className="w-full" 
                    variant="secondary" // Primary color button (e.g., blue or indigo)
                    size="lg" // Larger padding/height for mobile readability
                >
                    Haz una pregunta
                </Button>
            </div>
        </div>
    )
}