'use client';

import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import {
  getProductBasedLoc,
  getPromotionProductBasedLoc,
  getProducts,
} from '@/helper/product/product.helper';
import { IProduct } from '@/interface/product/product.interface';
import { IStock } from '@/interface/stock/stocks.interface';
import CardSkeletonList from './skeleton/card.skeleton';
import { Pagination } from '@mui/material';

export const ProductList = () => {
  // local state
  const [productData, setProductData] = useState<IProduct[]>([]);
  const [promoProductData, setPromoProductData] = useState<IProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPromoLoading, setIsPromoLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [nearestStore, setNearestStore] = useState<{
    name: string;
    distance: number;
  } | null>(null);

  const fetchProducts = async (page: number) => {
    setIsLoading(true);
    try {
      const lastCoords = localStorage.getItem('lastCoords');
      if (!lastCoords) {
        const response = await getProductBasedLoc(
          `products/from-nearest-store?lat=${`-6.1754024`}&lng=${`106.8271691649727`}&page=${page}&limit=10`,
        );
        const data = await response.json();
        setProductData(data.data.data);

        setTotalPages(Math.ceil(data.data.total / 10));
        setNearestStore(data.data.store);

        console.log('No coordinates found');
        return;
      }

      const { lat, lng } = JSON.parse(lastCoords);

      const response = await getProductBasedLoc(
        `products/from-nearest-store?lat=${lat}&lng=${lng}&page=${page}&limit=10`,
      );
      const data = await response.json();
      console.log('PRODUCT DATA======', data);
      if (data.data) {
        setProductData(data.data.data);

        setTotalPages(Math.ceil(data.data.total / 10));
        setNearestStore(data.data.store);
      } else {
        const response = await getProductBasedLoc(
          `products/from-nearest-store?lat=${`-6.1754024`}&lng=${`106.8271691649727`}&page=${page}&limit=10`,
        );
        const data = await response.json();
        setProductData(data.data.data);

        setTotalPages(Math.ceil(data.data.total / 10));
        setNearestStore(data.data.store);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromoProducts = async () => {
    setIsPromoLoading(true);
    try {
      const lastCoords = localStorage.getItem('lastCoords');
      if (!lastCoords) {
        console.log('No coordinates found');
        return;
      }

      const { lat, lng } = JSON.parse(lastCoords);

      const response = await getPromotionProductBasedLoc(
        `products/promotions/nearest?lat=${lat}&lng=${lng}&page=1&limit=10`,
      );
      const data = await response.json();

      if (data.data) {
        setPromoProductData(data.data.data);
        console.log('PROMO PRODUCT', promoProductData);
      }
    } catch (error) {
      console.error('Error fetching promotional products:', error);
    } finally {
      setIsPromoLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
    fetchPromoProducts();
  }, [currentPage]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number,
  ) => {
    setCurrentPage(page);
  };

  return (
    <div className="max-w7-xl lg:w-[70%] m-auto px-4 md:px-6 lg:px-0">
      <div className="py-4">
        <h3 className="text-xl md:text-3xl font-bold">Daging Yang Kamu Mau!</h3>
        <div className="m-auto my-5 grid grid-cols-2 md:text-sm md:grid-cols-3  lg:grid-cols-5  gap-4 md:ml-10 lg:ml-0">
          {isLoading ? (
            <CardSkeletonList />
          ) : (
            productData?.map((product, key) => (
              <Card product={product} key={key} />
            ))
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              variant="outlined"
              shape="rounded"
            />
          </div>
        )}
      </div>
      <div className="py-4">
        <h3 className="text-xl md:text-3xl font-bold ">Promo Menarik</h3>

        {!!promoProductData.length ? (
          <div className="m-auto my-5  grid grid-cols-2 text-xs md:text-sm md:grid-cols-3  lg:grid-cols-5 gap-4 md:ml-10 lg:ml-0">
            {isPromoLoading ? (
              <CardSkeletonList />
            ) : (
              promoProductData?.map((product, key) => (
                <Card product={product} key={key} />
              ))
            )}
          </div>
        ) : (
          <p className="w-full py-8">
            Belum ada promo menarik di toko terdekat
          </p>
        )}
      </div>
    </div>
  );
};
