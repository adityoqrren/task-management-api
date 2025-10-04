let createTaskProjectBPayloads = pm.environment.get('createTaskProjectBPayloads');
let projectIdProjectB = pm.environment.get('projectIdProjectB');
if (!createTaskProjectBPayloads | createTaskProjectBPayloads.length === 0) {
    createTaskProjectBPayloads = [
        {
            "title": "Project B task 2",
            "projectId": projectIdProjectB,
            "desc": "this is desc of task 2"
        },
        {
            "title": "Project B task 3",
            "projectId": projectIdProjectB,
            "desc": "this is desc of task 3"
        },
        {
            "title": "Project B task 4",
            "projectId": projectIdProjectB,
            "desc": "this is desc of task 4"
        },
        {
            "title": "Project B task 5",
            "projectId": projectIdProjectB,
            "desc": "this is desc of task 5"
        },
    ];
}

const currentCreateTaskProjectBPayload = createTaskProjectBPayloads.shift();
pm.environment.set('currentCreateTaskProjectBPayload', JSON.stringify(currentCreateTaskProjectBPayload));
pm.environment.set('createTaskProjectBPayloads', createTaskProjectBPayloads);