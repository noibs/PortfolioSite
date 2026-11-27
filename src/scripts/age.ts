const BIRTHDAY = { year: 2007, month: 5, day: 8 };

const danishDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "numeric",
    day: "numeric",
});

export function age(now: Date = new Date()): number {
    const parts = danishDate.formatToParts(now);
    const get = (type: string) =>
        Number(parts.find((p) => p.type === type)!.value);
    const [year, month, day] = [get("year"), get("month"), get("day")];
    const hadBirthday =
        month > BIRTHDAY.month ||
        (month === BIRTHDAY.month && day >= BIRTHDAY.day);
    return year - BIRTHDAY.year - (hadBirthday ? 0 : 1);
}
