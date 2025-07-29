import { InfoIcon } from 'lucide-react';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

const items = [
    {
        id: 'item-1',
        question: 'What is SimCasino?',
        answer:
            'SimCasino is an online gaming platform offering a variety of casino games.',
    },
    {
        id: 'item-2',
        question: 'How do I register?',
        answer: 'Click the register button on the homepage and fill in your details.',
    },
    {
        id: 'item-3',
        question: 'Is my information secure?',
        answer: 'Yes, we use industry standard security practices to protect data.',
    },
    {
        id: 'item-4',
        question: 'How can I deposit funds?',
        answer: 'Navigate to your profile and select the deposit option.',
    },
    {
        id: 'item-5',
        question: 'Where can I view my bets?',
        answer: 'Your bet history is available in the My Bets section.',
    },
];

export function Faq(): JSX.Element {
    return (
        <section className="py-8 container space-y-4">
            <div className="flex items-center gap-2">
                <InfoIcon className="size-4 icon-neutral-weak" />
                <h2 className="font-semibold">Still Have Questions?</h2>
            </div>
            <Accordion className="bg-brand-weak rounded-md" collapsible type="single">
                {items.map(item => (
                    <div className="mb-2 last:mb-0" key={item.id}>
                        <AccordionItem value={item.id}>
                            <AccordionTrigger className="px-4">{item.question}</AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">{item.answer}</AccordionContent>
                        </AccordionItem>
                    </div>
                ))}
            </Accordion>

        </section>
    );
}

export default Faq;
