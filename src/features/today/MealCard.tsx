import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { toHHMM } from '../../core/planner/slots';

export interface MealCardProps {
  meal: 'pranzo' | 'cena';
  startMin: number;
}

const MEAL_LABEL: Record<'pranzo' | 'cena', string> = {
  pranzo: 'Pranzo 🍝',
  cena: 'Cena 🍽️',
};

/**
 * Card pasto (pranzo/cena) nella timeline di Oggi (FR-5): mostra solo
 * l'orario di inizio (la durata effettiva vive nelle impostazioni pasto/nella
 * sessione, non qui) e apre il Timer Pasti già precaricato sul pasto giusto.
 */
export function MealCard({ meal, startMin }: MealCardProps) {
  const navigate = useNavigate();

  return (
    <div data-testid={`meal-card-${meal}`}>
      <Card className="border-2 border-sun/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg text-deep">{MEAL_LABEL[meal]}</p>
            <p className="font-body text-sm text-stone">{toHHMM(startMin)}</p>
          </div>
          <Button type="button" onClick={() => navigate(`/timer?pasto=${meal}`)}>
            Avvia il timer 🌈
          </Button>
        </div>
      </Card>
    </div>
  );
}
