```typescript
@Injectable()
class ApiService {
  fetchProjects(): Observable<Project[]>;
}

@Injectable()
class TaskStore {
  @observable tasks: Task[] = [];
  remove(id: string);
  toggle(id: string);
}

@Injectable()
class Logger {
  log(msg: string);
}

@Component({
  selector: 'status-badge',
  template: `<span class="badge" [class]="color">{{label}}</span>`,
  styles: `.badge { border-radius: 4px; padding: 4px 8px; }`
})
class StatusBadge extends RxElement {
  @observable label = '';
  @observable color = 'gray';
}

@Component({
  selector: 'task-row',
  template: `
    <div class="task" [class.done]="completed">
      <input type="checkbox" [checked]="completed" onchange="toggle" />
      <span class="title">{{title}}</span>
      <status-badge [label]="status" [color]="badgeColor"></status-badge>
      <button onclick="remove">Delete</button>
    </div>
  `,
  styles: `.task { display: flex; gap: 8px; } .done .title { text-decoration: line-through; }`
})
class TaskRow extends RxElement {
  @observable id = '';
  @observable title = '';
  @observable completed = false;
  @observable status = 'open';
  @observable badgeColor = 'blue';
  
  constructor(private store: TaskStore) {}
  
  toggle() { this.store.toggle(this.id); }
  remove() { this.store.remove(this.id); }
}

@Component({
  selector: 'project-board',
  template: `
    <div class="board">
      <header>
        <h2>{{projectName}}</h2>
        <span>{{taskCount}} tasks</span>
      </header>
      <rx-if [condition]="taskCount === 0">
        <template><div class="empty">No tasks yet</div></template>
      </rx-if>
      <rx-for [items]="tasks" [key]="id">
        <template>
          <task-row [id]="item.id" [title]="item.title" [completed]="item.completed"></task-row>
        </template>
      </rx-for>
    </div>
  `
})
class ProjectBoard extends RxElement {
  @observable projectName = '';
  @observable tasks: Task[] = [];
  @observable taskCount = 0;
  
  constructor(private store: TaskStore) {}
  
  onInit() {}
  onDestroy() {}
  onChanges(n: string, o: any, v: any) {}
  onAdopted() {}
}

@Component({
  selector: 'dashboard-page',
  template: `
    <div class="dashboard">
      <nav>
        <h1>{{appTitle}}</h1>
        <input #search type="text" placeholder="Search..." />
        <button onclick="refresh">Refresh</button>
      </nav>
      <rx-if [condition]="loading">
        <template><div class="spinner">Loading...</div></template>
      </rx-if>
      <rx-if [condition]="!loading">
        <template>
          <project-board #board [projectName]="activeProject.name" [tasks]="activeProject.tasks"></project-board>
        </template>
      </rx-if>
    </div>
  `
})
class DashboardPage extends RxElement {
  @observable appTitle = 'Dashboard';
  @observable loading = true;
  @observable activeProject: Project = { name: '', tasks: [] };
  
  @elementRef board: ProjectBoard;
  @elementRef search: HTMLInputElement;
  
  constructor(private api: ApiService, private store: TaskStore) {}
  
  onInit() {
    this.board.projectName = 'Overridden';
    this.search.focus();
  }
  
  refresh() {
    this.loading = true;
    this.load();
  }
  
  load() {
    this.api.fetchProjects().subscribe(p => {
      this.activeProject = p[0];
      this.store.tasks = p[0].tasks;
      this.loading = false;
    });
  }
}

@Component({
  selector: 'profile-page',
  template: `
    <div class="profile">
      <h2>Profile</h2>
      <p>{{bio}}</p>
    </div>
  `
})
class ProfilePage extends RxElement {
  @observable bio = 'User bio here';
}

@Component({
  selector: 'app-root',
  template: `
    <div class="app">
      <aside>
        <a onclick="navigateDash">Dashboard</a>
        <a onclick="navigateProfile">Profile</a>
      </aside>
      <main>
        <rx-router-outlet [route]="route"></rx-router-outlet>
      </main>
    </div>
  `,
  styles: `
    .app { display: flex; min-height: 100vh; }
    aside { width: 200px; background: #f0f0f0; }
    aside a { display: block; padding: 12px; cursor: pointer; }
  `
})
class AppRoot extends RxElement {
  @observable route = '/dash';
  
  navigateDash() { this.route = '/dash'; }
  navigateProfile() { this.route = '/profile'; }
}

const routes: Route[] = [
  { path: '/dash', component: DashboardPage },
  { path: '/profile', component: ProfilePage },
  { path: '*', redirect: '/dash' }
];

bootstrap({
  host: document.getElementById('app'),
  providers: [ApiService, TaskStore, Logger],
  routes,
  registry: [
    StatusBadge,
    TaskRow,
    ProjectBoard,
    DashboardPage,
    ProfilePage,
    AppRoot
  ]
});
```