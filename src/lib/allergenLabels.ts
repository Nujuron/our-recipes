import { type Allergen } from '$lib/allergens';
import * as m from '$lib/paraglide/messages';

const LABELS: Record<Allergen, () => string> = {
	gluten: m.allergen_gluten,
	crustaceans: m.allergen_crustaceans,
	eggs: m.allergen_eggs,
	fish: m.allergen_fish,
	peanuts: m.allergen_peanuts,
	soy: m.allergen_soy,
	milk: m.allergen_milk,
	nuts: m.allergen_nuts,
	celery: m.allergen_celery,
	mustard: m.allergen_mustard,
	sesame: m.allergen_sesame,
	sulphites: m.allergen_sulphites,
	lupin: m.allergen_lupin,
	molluscs: m.allergen_molluscs
};

export function allergenLabel(allergen: Allergen): string {
	return LABELS[allergen]();
}
