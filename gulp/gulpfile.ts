'use strict';
import {Gulpclass, Task, SequenceTask} from 'gulpclass/Decorators';

let gulp = require('gulp');
let del = require('del');

@Gulpclass()
export class Gulpfile {
    @Task()
    clean(cb: Function) {
        return del(['*.log', './dist/sqlite3orm/**', './docs/typedoc/**'], cb);
    }

    @SequenceTask()
    build() {
    }

    @Task()
    default() {
        return ['build'];
    }

}
