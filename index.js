'use strict';

$(document).ready(() => {
    const emoji = new EmojiConvertor();
    emoji.replace_mode = 'unified';
    emoji.allow_native = true;

    const vm = new Vue({
        el: '#app',
        data: {
            inputToken: localStorage.getItem('token') ?? '',
            list: []
        },
        computed: {
            token: (vm) => vm.inputToken.trim(),
            isTokenValid: (vm) => vm.token.length === 40
        },
        methods: {
            saveToken() {
                localStorage.setItem('token', this.token);
            },
            sort(arr, by) {
                function naturalSorter(as, bs) {
                    var a, b, a1, b1, i = 0, n, L,
                        rx = /(\.\d+)|(\d+(\.\d+)?)|([^\d.]+)|(\.\D+)|(\.$)/g;
                    if (as === bs) return 0;
                    a = as.toLowerCase().match(rx);
                    b = bs.toLowerCase().match(rx);
                    if (a == null && b == null) return 0;
                    if (a == null) return 1;
                    if (b == null) return -1;
                    var chinese = /.*[\u4e00-\u9fa5]+.*/;
                    if (chinese.test(a[0]) || chinese.test(b[0])) return a[0].localeCompare(b[0]);
                    L = a.length;
                    while (i < L) {
                        if (!b[i]) return 1;
                        a1 = a[i],
                            b1 = b[i++];
                        if (a1 !== b1) {
                            n = a1 - b1;
                            if (!isNaN(n)) return n;
                            return a1 > b1 ? 1 : -1;
                        }
                    }
                    return b[i] ? -1 : 0;
                }

                arr.sort(({ [by]: x }, { [by]: y }) => {
                    if (x === undefined && y === undefined) {
                        return 0;
                    } else if (x === undefined) {
                        return -1;
                    } else if (y === undefined) {
                        return 1;
                    } else if (!isNaN(x) && !isNaN(y)) {
                        return x - y;
                    } else {
                        return naturalSorter(String(x), String(y));
                    }
                });

                const reverseKey = '__sortReverse_' + by;

                if (arr[reverseKey]) {
                    arr.reverse();
                }

                arr[reverseKey] = !arr[reverseKey];
            },
            refresh() {
                $.get({ url: '/list.yaml', cache: false }).done((data) => {
                    try {
                        this.list = [];
                        for (const [type, repos] of Object.entries(jsyaml.load(data))) {
                            const currentType = {
                                name: type,
                                repos: []
                            };
                            this.list.push(currentType);
                            for (const [name, repo] of Object.entries(repos)) {
                                const currentRepo = {
                                    name,
                                    repo,
                                    link: `https://github.com/${repo}`,
                                    stars: 'Loading...',
                                    forks: 'Loading...',
                                    updated: 'Loading...',
                                    created: 'Loading...'
                                };
                                currentType.repos.push(currentRepo);
                                $.ajax({
                                    url: `https://api.github.com/repos/${repo}`,
                                    accepts: "application/vnd.github.v3+json",
                                    headers: {
                                        Accept: 'application/vnd.github.v3+json',
                                        Authorization: vm.token === '' ? undefined : `token ${vm.token}`
                                    },
                                    type: "GET",
                                    cache: false,
                                    success: function (info) {
                                        if (info.description) {
                                            currentRepo.description = emoji.replace_colons(info.description);
                                        }
                                        currentRepo.stars = info.stargazers_count;
                                        currentRepo.forks = info.forks_count;
                                        const updatedMoment = moment(info.updated_at);
                                        currentRepo.updated = updatedMoment.fromNow();
                                        currentRepo.updatedTitle = info.updated_at;
                                        currentRepo.updatedSort = updatedMoment.valueOf();
                                        const createdMoment = moment(info.created_at);
                                        currentRepo.created = createdMoment.fromNow();
                                        currentRepo.createdTitle = info.created_at;
                                        currentRepo.createdSort = createdMoment.valueOf();
                                    },
                                    error: function ({ status, statusText }) {
                                        const errorMessage = `Failed to get the info of [${repo}].\nStatus Code: ${status}\nStatus Text: ${statusText}`;
                                        console.error(errorMessage);
                                        currentRepo.stars = currentRepo.forks = currentRepo.updated = currentRepo.created = "Error";
                                        currentRepo.starsTitle = currentRepo.forksTitle = currentRepo.updatedTitle = currentRepo.createdTitle = errorMessage;
                                    }
                                });
                            }
                        };
                    } catch (e) {
                        console.error(e);
                        alert("Error occurred while rederring the list.");
                    }
                }).fail(function () {
                    alert("Error occurred while getting the list.");
                });
            }
        },
        created() {
            this.refresh();
        }
    });
});
