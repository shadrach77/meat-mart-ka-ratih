import express, {
  json,
  urlencoded,
  Express,
  Request,
  Response,
  NextFunction,
} from 'express';
import cors from 'cors';
import { PORT, supabase } from './config';
import authRouter from './routers/auth.router';
import adminRouter from './routers/admin.router';
import cartRouter from './routers/cart.router';
import productRouter from './routers/product.router';
import productDashboardRouter from './routers/product.dashboard.router';
import userRouter from './routers/user.router';
import discountRouter from './routers/discount.router';
import transactionRouter from './routers/transaction.router';
import orderRouter from './routers/order.router';
import transactionQueryRouter from './routers/transactionQuery.router';
import categoryDashboardRouter from './routers/category.dashboard.router';
import categoryRouter from './routers/category.router';
import stockRouter from './routers/stock.router';
import discountDashboardRouter from './routers/discount.dashboard.router';
import stockHistoryRouter from './routers/stockHistory.router';
import transactionDetailDashboardRouter from './routers/transactionDetail.dashboard.router';
import '@/cronjob/monthlyStockSnapshot.cronjob';
import orderQueryRouter from './routers/orderQuery.router';
import { deadlinePayment } from './helper/cronjob/transaction.cron';
import { orderConfirmation } from './helper/cronjob/order.cron';
// import { midTransSnap } from './helper/transaction/transaction.helper';
import addressRouter from './routers/address.router';
import storeRouter from './routers/store.router';

export default class App {
  private app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
    this.cron();
  }

  private configure(): void {
    this.app.use(
      cors({
        origin: [
          'https://meat-mart-ka-ratih-le52k4dmd-shadrachs-projects-a1a00fb0.vercel.app/',
          'http://localhost:3000',
          'https://accounts.google.com',
          'http://localhost:3000/api/auth/callback/google',
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      }),
    );
    this.app.use(json());
    this.app.use(urlencoded({ extended: true }));
  }

  // private configure(): void {
  //   this.app.use(cors());
  //   this.app.use(json());
  //   this.app.use(urlencoded({ extended: true }));
  // }

  private handleError(): void {
    // not found
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.includes('/api/')) {
        res.status(404).send('Not found !');
      } else {
        next();
      }
    });

    // error
    this.app.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        if (req.path.includes('/api/')) {
          console.error('Error : ', err.stack);
          res.status(500).send('Error !');
        } else {
          next();
        }
      },
    );
  }

  private routes(): void {
    // this.app.options('*', cors());
    this.app.use('/api/auth', authRouter.getRouter());
    this.app.use('/api/addresses', addressRouter.getRouter());
    this.app.use('/api/admin', adminRouter.getRouter());
    this.app.use('/api/order', orderRouter.getRouter());
    this.app.use('/api/order/list', orderQueryRouter.getRouter());
    this.app.use('/api/cart', cartRouter.getRouter());
    this.app.use('/api/products', productRouter.getRouter());
    this.app.use('/api/user', userRouter.getRouter());
    this.app.use('/api/transaction', transactionRouter.getRouter());
    this.app.use('/api/transaction/list', transactionQueryRouter.getRouter());
    this.app.use('/api/discount', discountRouter.getRouter());
    this.app.use('/api/product', adminRouter.getRouter());
    this.app.use(
      '/api/dashboard/category',
      categoryDashboardRouter.getRouter(),
    );
    // this.app.use('/api/product', adminRouter.getRouter());
    this.app.use('/api/store', storeRouter.getRouter());
    this.app.use('/api/category', categoryRouter.getRouter());
    this.app.use('/api/dashboard/product', productDashboardRouter.getRouter());
    this.app.use('/api/store', storeRouter.getRouter());
    this.app.use('/api/stock', stockRouter.getRouter());
    this.app.use(
      '/api/dashboard/discount',
      discountDashboardRouter.getRouter(),
    );
    this.app.use('/api/stockHistory', stockHistoryRouter.getRouter());
    this.app.use(
      '/api/dashboard/transactionDetail',
      transactionDetailDashboardRouter.getRouter(),
    );
    this.app.use('/api/discount', discountDashboardRouter.getRouter());
    this.app.use('/api/store/list', storeRouter.getRouter());
  }

  private cron(): void {
    deadlinePayment().start(); // cron for deadline payment
    orderConfirmation().start(); // cron for order confirmation
  }

  public start(): void {
    this.app.listen(PORT, () => {
      console.log(`  ➜ Hello from [API] Local:   http://localhost:${PORT}/`);
    });
  }
}
