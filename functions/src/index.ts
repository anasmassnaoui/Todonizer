import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const TODO_COLLECTION = 'Todo'

initializeApp();

const Tasks = {
    addNewTask: async (userId: string, task: string, priority: number) => {
        const db = getFirestore();
        await db.collection(TODO_COLLECTION).add({
            task,
            priority,
            userId,
            completed: false,
        });
    },
    getTasks: async (userId: string, priority?: number): Promise<[number, string][]> => {
        const db = getFirestore();
        let tasksRef = db
            .collection(TODO_COLLECTION)
            .where('userId', '==', userId)
            .where('completed', '==', false)
        if (typeof priority === 'number') {
            tasksRef = tasksRef.where('priority', '==', priority)
        }
        const tasks = await tasksRef.get()
        return tasks.docs.map(doc => [doc.data().priority, doc.data().task]);
    },
    getTask: async (userId: string, taskNumber: number): Promise<[string, string] | undefined> => {
        const db = getFirestore();
        const tasks = await db
            .collection(TODO_COLLECTION)
            .where('userId', '==', userId)
            .get();
        const task = tasks.docs[taskNumber]
        return task ? [task.data().task, task.id] : undefined;
    },
    markTaskAsComplete: async (taskId: string): Promise<void> => {
        const db = getFirestore();
        await db
            .collection(TODO_COLLECTION)
            .doc(taskId)
            .set({ completed: true, completedDate: new Date() })
    },
    changePriority: async (taskId: string, priority: number): Promise<void> => {
        const db = getFirestore();
        await db
            .collection(TODO_COLLECTION)
            .doc(taskId)
            .set({ priority })
    },
}

export const addTask = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id as string;
    const text = request.body.text as string;
    if (!text) {
        response.send("Usage: /add-task [task name]\nexample: /add-task deploy the app to the store");
    } else {
        await Tasks.addNewTask(userId, text, 0);
        response.send(`The Task *${text}* Added Successfully`);
    }
});

export const addExtraTask = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id as string;
    const text = request.body.text as string;
    if (!text) {
        response.send("Usage: /add-extra-task [extra task name]\nexample: /add-extra-task code review for project");
    } else {
        await Tasks.addNewTask(userId, text, 1);
        response.send(`The Extra Task *${text}* Added Successfully`);
    }
});

export const tasks = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id;
    const tasks = await Tasks.getTasks(userId, 0)
    const extraTasks = await Tasks.getTasks(userId, 1)
    if (tasks.length === 0 && extraTasks.length === 0) {
        response.send(`No Tasks found!`);
    } else {
        let message = ''
        if (tasks.length !== 0) {
            message += `Here is your tasks list:\n`;
            for (let i = 0; i < tasks.length; i++)
                message += `${i} - ${tasks[i][1]}\n`
        }
        if (extraTasks.length !== 0) {
            message += `Here is your extra tasks list:\n`;
            for (let i = 0; i < extraTasks.length; i++)
                message += `${tasks.length + i} - ${extraTasks[i][1]}\n`
        }
        response.send(message);
    }
});

export const completeTask = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id;
    const taskNumber = parseInt(request.body.text || '');
    if (isNaN(taskNumber)) {
        response.send("Usage: /complete-task [task number]\nexample: /complete-task 3");
    } else {
        const task = await Tasks.getTask(userId, taskNumber);
        if (!task) {
            response.send(`Task ${taskNumber} not found!`);
        } else {
            const [text, taskId] = task;
            await Tasks.markTaskAsComplete(taskId);
            response.send(`Task *${text}* marked as completed`);
        }
    }
});

export const todayTasks = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id;
    const userName = request.body.user_name;
    const tasks = await Tasks.getTasks(userId, 0)
    if (tasks.length === 0) {
        response.send(`No Tasks found, please added tasks then try again`);
    } else {
        let message = `Hi <@${userName}>, Here is your tasks for today:\n`;
        for (let i = 0; i < tasks.length; i++)
            message += `${tasks[i][1]}\n`
        response.send(message);
    }
});

export const moveToTasks = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id;
    const taskNumber = parseInt(request.body.text || '');
    if (isNaN(taskNumber)) {
        response.send("Usage: /move-to-tasks [task number]\nexample: /move-to-tasks 3");
    } else {
        const task = await Tasks.getTask(userId, taskNumber);
        if (!task) {
            response.send(`Task ${taskNumber} not found!`);
        } else {
            const [text, taskId] = task;
            await Tasks.changePriority(taskId, 0);
            response.send(`Task *${text}* moved to tasks`);
        }
    }
});

export const moveToExtra = onRequest(async (request, response) => {
    logger.log("body:", request.body);
    const userId = request.body.user_id;
    const taskNumber = parseInt(request.body.text || '');
    if (isNaN(taskNumber)) {
        response.send("Usage: /move-to-extra [task number]\nexample: /move-to-extra 3");
    } else {
        const task = await Tasks.getTask(userId, taskNumber);
        if (!task) {
            response.send(`Task ${taskNumber} not found!`);
        } else {
            const [text, taskId] = task;
            await Tasks.changePriority(taskId, 1);
            response.send(`Task *${text}* moved to extra tasks`);
        }
    }
});

