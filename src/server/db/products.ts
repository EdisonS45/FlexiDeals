import { db } from "@/drizzle/db"
import {
  CountryGroupDiscountTable,
  ProductCustomizationTable,
  ProductTable,
} from "@/drizzle/schema"
import {
  CACHE_TAGS,
  dbCache,
  getGlobalTag,
  getIdTag,
  getUserTag,
  revalidateDbCache,
} from "@/lib/cache"
import { removeTrailingSlash } from "@/lib/utils"
import { and, count, eq, inArray, sql } from "drizzle-orm"
import { BatchItem } from "drizzle-orm/batch"

export function getProducts(
    userId: string,
    { limit }: { limit?: number } = {}
  ) {
    const cacheFn = dbCache(getProductsInternal, {
      tags: [getUserTag(userId, CACHE_TAGS.products)],
    })
  
    return cacheFn(userId, { limit })
  }

export async function createProduct(data: typeof ProductTable.$inferInsert) {
    const [newProduct] = await db
      .insert(ProductTable)
      .values(data)
      .returning({ id: ProductTable.id, userId: ProductTable.clerkUserId })
  
    try {
      await db
        .insert(ProductCustomizationTable)
        .values({
          productId: newProduct.id,
        })
        .onConflictDoNothing({
          target: ProductCustomizationTable.productId,
        })
    } catch (e) {
      await db.delete(ProductTable).where(eq(ProductTable.id, newProduct.id))
    }
  
    revalidateDbCache({
      tag: CACHE_TAGS.products,
      userId: newProduct.userId,
      id: newProduct.id,
    })
  
    return newProduct
  }

export async function deleteProduct({
    id,
    userId,
  }: {
    id: string,
    userId: string
    }) {
    const { rowCount } = await db
      .delete(ProductTable)
      .where(and(eq(ProductTable.id, id), eq(ProductTable.clerkUserId, userId)))
  
    if (rowCount > 0) {
      revalidateDbCache({
        tag: CACHE_TAGS.products,
        userId,
        id,
      })
    }
  
    return rowCount > 0
  }

function getProductsInternal(userId: string, { limit }: { limit?: number }) {
    return db.query.ProductTable.findMany({
      where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
      orderBy: ({ createdAt }, { desc }) => desc(createdAt),
      limit,
    })
  }