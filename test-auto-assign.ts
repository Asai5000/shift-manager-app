import { getAMTaskOptions } from './src/actions/am-tasks';

async function run() {
    try {
        const result = await getAMTaskOptions();
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
