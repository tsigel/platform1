export type PromiseEntry<T> = T extends Promise<infer R> ? R : never;
export type ArrayEntry<T> = T extends Array<infer R> ? R : never;

export type Replace<T, Key extends keyof T, Target> = {
    [K in keyof T]: K extends Key ? Target : T[K]
}

export type Optional<T, Key extends keyof T> = Omit<T, Key> & Partial<Pick<T, Key>>;