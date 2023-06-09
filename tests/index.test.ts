import { setTimeout } from 'timers/promises';
import { ConsumeFunction, Consumer, Feeder, PushStream } from '../src/index';

function getResultMocks() {
	return {
		output: jest.fn(),
		success: jest.fn(),
		failure: jest.fn()
	}
}

class SimpleFeeder extends Feeder<number> {

	constructor(private data: number, private success?: jest.Mock, private failure?: jest.Mock) {
		super();
	}

	protected setupFeed(c: ConsumeFunction<number>): PushStream {
		let s = new PushStream();
		this.next(this.data, c, s)
			.then(() => {
				if (this.success !== undefined) this.success(this.data);
			})
			.catch(() => {
				if (this.failure !== undefined) this.failure(this.data);
			})
		return s;
	}
}

class SimpleConsumer extends Consumer<number> {

	constructor(private mock: jest.Mock<any, any, any>) {
		super();
	}

	consume(data: number | number[]): Promise<void> {
		this.mock(data);
		return Promise.resolve();
	}
}

describe('Simple feeder', () => {

	it('Feed', () => {
		const mocks = getResultMocks();

		const c: ConsumeFunction<number> = (n) => {
			mocks.output(n);
			return Promise.resolve();
		};
		const TEST_VALUE = 99;
		const f = new SimpleFeeder(TEST_VALUE, mocks.success, mocks.failure);
		f.feeds(c);
		return setTimeout(10)
			.then(() => {
				expect(mocks.output).toBeCalledTimes(1);
				expect(mocks.output).toBeCalledWith(TEST_VALUE);
				expect(mocks.success).toBeCalledTimes(1);
				expect(mocks.success).toBeCalledWith(TEST_VALUE);
				expect(mocks.failure).toBeCalledTimes(0);
			});

	});

	it('Throws handling', () => {
		const TEST_VALUE = 1;
		const ERROR_VALUE = 2;
		const mocks = getResultMocks();

		const c: ConsumeFunction<number> = (n) => {
			if (n === ERROR_VALUE) {
				return Promise.reject(ERROR_VALUE);
			}
			return Promise.resolve();
		};
		const handler: ConsumeFunction<number> = (n) => {
			mocks.output(n);
			return Promise.resolve();
		};

		const f = new SimpleFeeder(TEST_VALUE);
		f.feeds(c);
		f.feeds(c);
		const fe = new SimpleFeeder(ERROR_VALUE, mocks.success, mocks.failure);
		fe.feeds(c).throwsTo(handler);

		return setTimeout(10)
			.then(() => {
				expect(mocks.output).toBeCalledTimes(1);
				expect(mocks.output).toHaveBeenCalledWith(ERROR_VALUE);
				expect(mocks.success).toBeCalledTimes(1);
				expect(mocks.success).toHaveBeenCalledWith(ERROR_VALUE);
				expect(mocks.failure).toBeCalledTimes(0);
			});
	});

	it('Throws reject handling', () => {
		const TEST_VALUE = 4;
		const mocks = getResultMocks();

		const c: ConsumeFunction<number> = (n) => {
			return Promise.reject(n);
		};
		const handler: ConsumeFunction<number> = (n) => {
			return Promise.reject(n);
		};

		const fe = new SimpleFeeder(TEST_VALUE, mocks.success, mocks.failure);
		fe.feeds(c).throwsTo(handler);

		const ff = new SimpleFeeder(TEST_VALUE, mocks.success, mocks.failure);
		ff.feeds(c);

		return setTimeout(10)
			.then(() => {
				expect(mocks.success).toBeCalledTimes(0);
				expect(mocks.failure).toBeCalledTimes(2);
				expect(mocks.failure).toHaveBeenCalledWith(TEST_VALUE);
			});
	});
});

describe('Simple consumer', () => {
	it('Consume', () => {
		let fn = jest.fn();
		const TEST_VALUE = 98;
		new SimpleFeeder(TEST_VALUE).feeds(new SimpleConsumer(fn));
		expect(fn).toBeCalledTimes(1);
		expect(fn).toBeCalledWith(TEST_VALUE);
	})
});

describe('PushStream', () => {
	it('Enabled', () => {
		let p = new PushStream();
		expect(p.enabled).toBe(true);
	});
	it('Resume', () => {
		const fn = jest.fn();
		let p = new PushStream();
		p.resume = () => {
			fn();
		};
		expect(p.enabled).toBe(true);
		p.enabled = true;
		p.enabled = false;
		p.enabled = false;
		expect(fn).toBeCalledTimes(0);
		p.enabled = true;
		expect(fn).toBeCalledTimes(1);
	});
}); 