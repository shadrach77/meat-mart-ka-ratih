import { statusEnum } from '@/enums/statusEnum.enums';
import { serviceFeedback } from '@/interface/serviceFeedback.interface';
import { Request } from 'express';
import prisma from '@/prisma';
import { getCategoryById, getCategoryByName } from '@/helper/category.prisma';
import {
  getDiscountByDiscountCode,
  getDiscountById,
} from '@/helper/discount.prisma';
import { getStoreById } from '@/helper/store.prisma';
import { findProductById } from '@/helper/product/product.helper';
import { Prisma } from '@prisma/client';

class DiscountService {
  async getAllDiscounts(req: Request) {
    const rawLimit = Number(req.query.limit);
    const rawPage = Number(req.query.page);
    const limit = !Number.isNaN(rawLimit) && rawLimit > 0 ? rawLimit : 10;
    const page = !Number.isNaN(rawPage) && rawPage > 0 ? rawPage : 1;
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;

    const where: Prisma.DiscountsWhereInput = {
      ...(req.query.includeDeleted === 'true' ? {} : { deleted_at: null }),
      ...(query
        ? { discount_code: { contains: query, mode: 'insensitive' } }
        : {}),
      store_id: req.query.storeId as string,
    };

    if (!req.query.storeId) {
      const feedback: serviceFeedback = {
        code: 400,
        data: null,
        status: statusEnum.FAILED,
        message: `storeId is required to fetch all stocks.`,
      };
      return feedback;
    }

    const [allDiscounts, count] = await Promise.all([
      prisma.discounts.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { created_at: 'desc' },
        include: {
          products: true,
        },
      }),
      prisma.discounts.count({ where }),
    ]);

    const feedback: serviceFeedback = {
      code: 200,
      data: { discounts: allDiscounts, count: count },
      status: statusEnum.SUCCESS,
      message: `Successfully fetched all discounts.`,
    };
    return feedback;
  }

  async getDiscount(req: Request) {
    if (!req.query.discountCode && !req.query.id) {
      const feedback: serviceFeedback = {
        code: 400,
        data: null,
        status: statusEnum.FAILED,
        message: `Discount Code or ID is required to fetch discount.`,
      };
      return feedback;
    }

    let discount;

    if (req.query.discountCode) {
      discount = await getDiscountByDiscountCode(
        req.query.discountCode as string,
      );
    }

    if (req.query.id) {
      discount = await getDiscountById(req.query.id as string);
    }

    if (
      (discount &&
        discount.deleted_at &&
        req.query.includeDeleted !== 'true') ||
      !discount
    ) {
      const feedback: serviceFeedback = {
        code: 404,
        data: null,
        status: statusEnum.FAILED,
        message: req.query.discountCode
          ? `Discount with discountCode ${req.query.discountCode} does not exist.`
          : `Discount with ID ${req.query.id} does not exist.`,
      };
      return feedback;
    }

    const feedback: serviceFeedback = {
      code: 200,
      data: discount,
      status: statusEnum.SUCCESS,
      message: req.query.name
        ? `Successfully fetched discount with discountCode ${req.query.discountCode}.`
        : `Successfully fetched discount with ID ${req.query.id}.`,
    };
    return feedback;
  }

  async createDiscount(req: Request) {
    const existingDiscount = await getDiscountByDiscountCode(
      req.body.discount_code,
    );

    if (
      req.query.restore === 'true' &&
      existingDiscount &&
      existingDiscount.deleted_at
    ) {
      const existingProduct = await findProductById(
        existingDiscount.product_id!,
      );
      const existingStore = await getStoreById(existingDiscount.store_id);

      if (
        (existingDiscount.product_id && existingProduct?.deleted_at) ||
        existingStore?.deleted_at
      ) {
        const feedback: serviceFeedback = {
          code: 403,
          data: null,
          status: statusEnum.FAILED,
          message: `Discount with discountCode ${req.body.discount_code} cannot been restored because the product or store associated with it has been deleted.`,
        };
        return feedback;
      }

      const existingDiscountOnProductId = await prisma.discounts.findFirst({
        where: { product_id: existingDiscount.product_id, deleted_at: null },
      });
      if (existingDiscountOnProductId) {
        const feedback: serviceFeedback = {
          code: 409,
          data: null,
          status: statusEnum.FAILED,
          message: `Another discount associated with product with productId ${existingDiscount.product_id} already exists.`,
        };
        return feedback;
      }

      const restoredDiscount = await prisma.discounts.update({
        where: { discount_code: req.body.discount_code },
        data: { deleted_at: null },
      });

      const feedback: serviceFeedback = {
        code: 200,
        data: restoredDiscount,
        status: statusEnum.SUCCESS,
        message: `Discount with discountCode ${req.body.discount_code} has been restored.`,
      };
      return feedback;
    }

    if (existingDiscount) {
      const feedback: serviceFeedback = {
        code: 409,
        data: null,
        status: statusEnum.FAILED,
        message: `Discount with discount code ${req.body.discount_code} already exists.`,
      };
      return feedback;
    }

    let newDiscount;

    if (
      req.body.promotion_type !== 'BOGO' &&
      req.body.discount_percentage &&
      req.body.discount_amount
    ) {
      const feedback: serviceFeedback = {
        code: 400,
        data: null,
        status: statusEnum.FAILED,
        message: `Cannot create amount-based discounts with both discount_percentage and discount_amount applied. Please opt for one.`,
      };
      return feedback;
    }

    if (req.body.product_id) {
      const existingDiscountOnProductId = await prisma.discounts.findFirst({
        where: { product_id: req.body.product_id, deleted_at: null },
      });
      if (existingDiscountOnProductId) {
        const feedback: serviceFeedback = {
          code: 409,
          data: null,
          status: statusEnum.FAILED,
          message: `Another discount associated with product with productId ${req.body.product_id} already exists.`,
        };
        return feedback;
      }
    }

    let newDiscountBody = {
      store_id: req.body.store_id,
      start_date: new Date(req.body.start_date),
      end_date: new Date(req.body.end_date),
      discount_code: req.body.discount_code,
      is_valid: true,
      promotion_type: req.body.promotion_type,
    };

    if (req.body.promotion_type === 'CUSTOM') {
      newDiscount = await prisma.discounts.create({
        data: {
          ...newDiscountBody,
          product_id: req.body.product_id,
          discount_amount: req.body.discount_amount ?? null,
          discount_percentage: req.body.discount_percentage ?? null,
        },
      });
    }

    if (req.body.promotion_type === 'MINIMUM_BUY') {
      newDiscount = await prisma.discounts.create({
        data: {
          ...newDiscountBody,
          discount_amount: req.body.discount_amount ?? null,
          discount_percentage: req.body.discount_percentage ?? null,
          minimum_purchase: req.body.minimum_purchase,
          maximum_discount_amount: req.body.maximum_discount_amount,
        },
      });
    }

    if (req.body.promotion_type === 'BOGO') {
      newDiscount = await prisma.discounts.create({
        data: {
          ...newDiscountBody,
          product_id: req.body.product_id,
        },
      });
    }

    const feedback: serviceFeedback = {
      code: 201,
      data: newDiscount,
      status: statusEnum.SUCCESS,
      message: `Discount with discount code ${req.body.discount_code} successfully created.`,
    };
    return feedback;
  }

  async updateDiscount(req: Request) {
    if (!req.params.id) {
      const feedback: serviceFeedback = {
        code: 400,
        data: null,
        status: statusEnum.FAILED,
        message: `ID is required to update discount.`,
      };
      return feedback;
    }

    const existingDiscount = await getDiscountById(req.params.id);

    if (!existingDiscount || existingDiscount.deleted_at) {
      const feedback: serviceFeedback = {
        code: 404,
        data: null,
        status: statusEnum.FAILED,
        message: `Discount with ID ${req.params.id} does not exist.`,
      };
      return feedback;
    }

    const existingDiscountCodeName = await getDiscountByDiscountCode(
      req.body.discount_code,
    );
    if (
      existingDiscountCodeName &&
      existingDiscountCodeName.id !== req.params.id
    ) {
      const feedback: serviceFeedback = {
        code: 400,
        data: null,
        status: statusEnum.FAILED,
        message: `${req.body.discount_code} is identical to another discount_code. Discount codes must be unique.`,
      };
      return feedback;
    }

    const updatedDiscount = await prisma.discounts.update({
      data: {
        ...req.body,
        start_date: new Date(req.body.start_date),
        end_date: new Date(req.body.end_date),
      },
      where: {
        id: req.params.id,
      },
    });
    const feedback: serviceFeedback = {
      code: 200,
      data: updatedDiscount,
      status: statusEnum.SUCCESS,
      message: `Category with ID ${req.params.id} successfully updated.`,
    };
    return feedback;
  }

  async deleteDiscount(req: Request) {
    if (!req.params.id) {
      const feedback: serviceFeedback = {
        code: 400,
        data: null,
        status: statusEnum.FAILED,
        message: `ID is required to delete discount.`,
      };
      return feedback;
    }

    const existingDiscount = await getDiscountById(req.params.id);

    if (!existingDiscount || existingDiscount.deleted_at) {
      const feedback: serviceFeedback = {
        code: 404,
        data: null,
        status: statusEnum.FAILED,
        message: `Discount with ID ${req.params.id} does not exist.`,
      };
      return feedback;
    }

    const deletedDiscount = await prisma.discounts.update({
      where: {
        id: req.params.id,
      },
      data: {
        deleted_at: new Date(),
      },
    });
    const feedback: serviceFeedback = {
      code: 200,
      data: deletedDiscount,
      status: statusEnum.SUCCESS,
      message: `Discount with ID ${req.params.id} successfully deleted.`,
    };
    return feedback;
  }
}

export default new DiscountService();
