import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Games } from '@/const/games';

import { GAME_DESCRIPTIONS } from './descriptions';

interface GameDescriptionAccordionProps {
  game: Games;
}

const GAME_STATS: Record<
  Games,
  {
    rtp: string;
    houseEdge: string;
    multiplier: string;
    cashOut: string;
    provablyFair: string;
    demoMode: string;
  }
> = {
  [Games.DICE]: {
    rtp: '99%',
    houseEdge: '1%',
    multiplier: 'Up to 9,900x',
    cashOut: 'Yes',
    provablyFair: 'Yes',
    demoMode: 'Yes',
  },
  [Games.ROULETTE]: {
    rtp: '97%',
    houseEdge: '3%',
    multiplier: 'Up to 35x',
    cashOut: 'No',
    provablyFair: 'Yes',
    demoMode: 'Yes',
  },
  [Games.MINES]: {
    rtp: '98%',
    houseEdge: '2%',
    multiplier: 'Varies',
    cashOut: 'Yes',
    provablyFair: 'Yes',
    demoMode: 'Yes',
  },
  [Games.KENO]: {
    rtp: '96%',
    houseEdge: '4%',
    multiplier: 'Varies',
    cashOut: 'No',
    provablyFair: 'Yes',
    demoMode: 'Yes',
  },
  [Games.BLACKJACK]: {
    rtp: '99%',
    houseEdge: '1%',
    multiplier: 'Up to 2x',
    cashOut: 'No',
    provablyFair: 'Yes',
    demoMode: 'Yes',
  },
  [Games.PLINKOO]: {
    rtp: '99%',
    houseEdge: '1%',
    multiplier: 'Up to 1,000x',
    cashOut: 'Yes',
    provablyFair: 'Yes',
    demoMode: 'Yes',
  },
};

export default function GameDescriptionAccordion({
  game,
}: GameDescriptionAccordionProps): JSX.Element {
  const info = GAME_DESCRIPTIONS[game];
  const stats = GAME_STATS[game];

  return (
    <Accordion
      className="bg-brand-weak rounded-md"
      collapsible
      defaultValue="item-1"
      type="single"
    >
      <AccordionItem value="item-1">
        <AccordionTrigger className="px-4 text-lg font-semibold">
          {info.title}
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img
              alt={info.title}
              className="w-32 h-32 object-cover rounded"
              src={info.image}
            />
            <p className="flex-1">{info.description}</p>
          </div>
          <Table className="[&_tr:nth-child(odd)>td]:bg-brand-weaker [&_tr:nth-child(even)>td]:bg-brand-stronger [&_tr>td:first-child]:rounded-l-sm [&_tr>td:last-child]:rounded-r-sm [&_td]:border-b mt-4">
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">RTP</TableCell>
                <TableCell>{stats.rtp}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">House Edge</TableCell>
                <TableCell>{stats.houseEdge}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Multiplier</TableCell>
                <TableCell>{stats.multiplier}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Cash Out</TableCell>
                <TableCell>{stats.cashOut}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Provably Fair</TableCell>
                <TableCell>{stats.provablyFair}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Demo Mode</TableCell>
                <TableCell>{stats.demoMode}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
