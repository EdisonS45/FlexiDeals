import {z} from "zod"
import { removeTrailingSlash } from "@/lib/utils"
export const productDetailsSchema = z.object({
    name:z.string().min(1, "Required"),
    url:z.string().url().min(1, "Required").transform(removeTrailingSlash),
    description: z.string().optional(),
})