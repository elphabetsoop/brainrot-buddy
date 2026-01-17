export const errorMessageTiers = [
	{ threshold: 1, message: "oops got error leh" },
	{ threshold: 2, message: "eh why got errors sia" },
	{ threshold: 3, message: "knn WHY GOT MISTAKES" },
	{ threshold: 4, message: "cbbbb why sm errors wtf" },
	{ threshold: 5, message: "BRO WTF R U DOING" },
];

export const successMessages = [
	"FIRE COMMIT",
	"YES LAHHHH",
];

export const actions: Record<string, string> = {
	idle: "bingchilling",
	error: "crashing out",
	success: "says FIREEEE"
};

export function getErrorMessageForCount(errorCount: number): string {
	let message = errorMessageTiers[0].message;
	for (const tier of errorMessageTiers) {
		if (errorCount >= tier.threshold) {
			message = tier.message;
		}
	}
	return message;
}

export function getRandomSuccessMessage(): string {
	return successMessages[Math.floor(Math.random() * successMessages.length)];
}
