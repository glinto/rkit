import { PushStream, ConsumeFunction, Feeder, ConsumerBehavior, Feedable } from "..";

export class TriggeredPushStream extends PushStream {
    constructor(public trigger: ConsumeFunction<any>) {
        super();
    }
}

/**
 * A `Silo` acts like a holding tank which consumes data, stores it and
 * release it when it receives a trigger signal. Multiple data can be fed to a
 * `Silo`, and on a trigger signal it will release everything.
 * 
 * The trigger itself is a consumer, to which any feeder can be connected to.
 * To feed to a Silo's trigger, use the `trigger` property to get a `Feedable`
 * endpoint, like this: `myFeeder.feeds(mySilo.trigger)`
 */
export class Silo<T> extends Feeder<T> implements ConsumerBehavior<T> {

    store: T[] = [];

    constructor() {
        super();
    }

    consume(data: T | T[]): Promise<void> {
        if (Array.isArray(data))
            this.store.push(...data);
        else
            this.store.push(data)
        return Promise.resolve();
    }

    get connector(): ConsumeFunction<T> {
        return this.consume.bind(this);
    }

    override feeds(target: Feedable<T>): TriggeredPushStream {
        return this.setupFeed(Feeder.getConsumeFunction(target));
    }


    protected setupFeed(c: ConsumeFunction<T>): TriggeredPushStream {
        let stream = new TriggeredPushStream(
            () => {
                if (stream.enabled) {
                    let data = this.store;
                    this.store = [];
                    return c(data);
                }
                else {
                    return Promise.resolve();
                }

            }
        );
        return stream;
    }
}