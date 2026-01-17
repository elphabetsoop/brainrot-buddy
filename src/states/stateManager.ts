export const errorMessages = [
	"eh why got error sia",
	"knn gt error",
	"cb got bug",
	"oi error lah help",
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

export function getRandomErrorMessage(): string {
	return errorMessages[Math.floor(Math.random() * errorMessages.length)];
}

export function getRandomSuccessMessage(): string {
	return successMessages[Math.floor(Math.random() * successMessages.length)];
}
