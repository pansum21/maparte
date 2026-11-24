// Scroll progress of the pinned hero (0 = top of the hero, 1 = end of the hero).
// The hero writes it once per animation frame, so other scroll listeners can read it
// without measuring the hero's layout again.
let heroProgress = 0;

export const setHeroProgress = (value: number) => {
	heroProgress = value;
};

export const getHeroProgress = () => heroProgress;
