import { env } from '$env/dynamic/private'
export const load = async () => {
    return { API_KEY: env.API_KEY }
}