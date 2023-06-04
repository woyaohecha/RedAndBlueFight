import { _decorator, Component, Node, instantiate, CCObject, Vec3, animation, SkeletalAnimation, BoxCollider, ITriggerEvent, v3, tween, Tween, RigidBody, SphereCollider, CapsuleCollider, Collider, physics, ICollisionEvent } from 'cc';
import { TEAM } from '../Manager/GameManager';
import { PrefabManager } from '../Manager/PrefabManager';
import Tools from '../Tools';
import { Base } from './Base';


const PeopleShieldMaxHp: number = 100;
const PeopleShieldAtk: number = 1;
const PeopleShieldAtkInterval: number = 3;
const PeopleShieldAtkDistance: number = 3;
const PeopleShieldMoveSpeed: number = 20;

export class PeopleShield {

    role: Node;
    team: TEAM;
    hp: number;
    maxHp: number;
    atk: number;
    atkInterval: number;
    atkDistance: number;
    anim: SkeletalAnimation;
    rigbody: RigidBody;
    trgCollider: SphereCollider;
    phyCollider: CapsuleCollider;
    enemyBase: Base;
    isAtking: boolean;
    isDie: boolean;

    constructor(team: TEAM, parent: Node, bornPos: Vec3, enemyBase: Base) {
        let prefab = team == TEAM.RED ? PrefabManager.prefab_red_people_gun : PrefabManager.prefab_blue_people_gun;
        let people = instantiate(prefab);
        people.parent = parent;
        people.position = bornPos;

        this.role = people;
        this.role.on("hit", this.hit, this);
        this.team = team;
        this.maxHp = PeopleShieldMaxHp;
        this.hp = this.maxHp;
        this.atk = PeopleShieldAtk;
        this.atkInterval = PeopleShieldAtkInterval;
        this.atkDistance = PeopleShieldAtkDistance;
        this.enemyBase = enemyBase;
        this.anim = this.role.getComponent(SkeletalAnimation);
        this.rigbody = this.role.getComponent(RigidBody);
        this.trgCollider = this.role.getComponent(SphereCollider);
        this.phyCollider = this.role.getComponent(CapsuleCollider);
        this.trgCollider.on("onTriggerStay", this.onTriggerStay, this);
        this.trgCollider.on("onTriggerExit", this.onTriggerExit, this);
        this.phyCollider.on("onCollisionStay", this.onCollisionStay, this);
        this.phyCollider.on("onCollisionExit", this.onCollisionExit, this);
        this.isAtking = false;
        this.isDie = false;
        let time = Tools.getRandomNum(0, 2);
        setTimeout(() => {
            this.move();
        }, time * 100);
    }

    moveInterval;
    move() {
        if (this.isDie) {
            return;
        }
        console.log("角色移动");
        let temp = this.team == TEAM.RED ? 1 : -1;
        this.rigbody.linearDamping = 0;
        this.moveInterval = setInterval(() => {
            if (this.isDie) {
                clearInterval(this.moveInterval);
                return;
            }
            if (this.rigbody.linearDamping == 1) {
                this.anim.play("shield_atk");
            } else {
                this.anim.play("shield_move");
            }
            this.rigbody.setLinearVelocity(new Vec3(temp * PeopleShieldMoveSpeed, 0, 0));
        }, 1000, this);
    }


    isTriggerEnter: boolean = false;
    currentTrigger: Collider = null;
    onTriggerStay(event: ITriggerEvent) {
        if (event.otherCollider.getGroup() == event.selfCollider.getGroup() || (event.otherCollider.isTrigger && event.otherCollider.type != physics.EColliderType.BOX) || this.isTriggerEnter) {
            return;
        }
        this.isTriggerEnter = true;
        this.currentTrigger = event.otherCollider;
        this.rigbody.linearDamping = 1;
        this.anim.play("shield_atk");
        this.doAtk(event.otherCollider.node);
    }

    onTriggerExit(event: ITriggerEvent) {
        if (this.isTriggerEnter && this.currentTrigger == event.otherCollider) {
            this.isTriggerEnter = false;
            this.currentTrigger = null;
            this.rigbody.linearDamping = 0;
        }
    }

    onCollisionStay(event: ICollisionEvent) {

    }



    onCollisionExit(event: ICollisionEvent) {

    }

    atkCall;
    doAtk(target: Node) {
        this.atkCall = setInterval(() => {
            if (!target.isValid || this.isDie) {
                this.isTriggerEnter = false;
                this.currentTrigger = null;
                this.rigbody.linearDamping = 0;
                clearInterval(this.atkCall)
                return;
            }
            console.log(this.role.position);
            target.emit("hit", this.atk)
        }, this.atkInterval * 1000, this);
    }

    hit(atkValue: number) {
        if (this.isDie) {
            return;
        }
        console.log("受到攻击");
        this.hp -= atkValue;
        if (this.hp <= 0) {
            console.log("死亡:", this.role.name);
            this.isDie = true;
            this.isTriggerEnter = false;
            clearInterval(this.atkCall);
            clearInterval(this.moveInterval);
            this.role.destroy();
        }
    }

    die() {
        this.isDie = true;
        if (this.role.isValid) {
            this.role.destroy();
        }
        clearInterval(this.atkCall);
        clearInterval(this.moveInterval);
    }

}

